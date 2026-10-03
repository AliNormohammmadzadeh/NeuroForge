import numpy as np
import pytest

from neuroforge.data.preprocessing import (
    Pipeline,
    PreprocessConfig,
    ZScore,
    bandpass,
    bin_spikes,
    common_average_reference,
    notch,
)


def _tone(freq: float, sfreq: float = 250.0, seconds: float = 20.0) -> np.ndarray:
    t = np.arange(0, seconds, 1 / sfreq)
    return np.sin(2 * np.pi * freq * t)


def _band_power(x: np.ndarray, sfreq: float, freq: float, bandwidth: float = 1.0) -> float:
    spectrum = np.abs(np.fft.rfft(x)) ** 2
    freqs = np.fft.rfftfreq(x.shape[-1], d=1 / sfreq)
    mask = (freqs >= freq - bandwidth / 2) & (freqs <= freq + bandwidth / 2)
    return float(spectrum[mask].mean())


def test_notch_drops_line_noise_and_keeps_the_signal() -> None:
    sfreq = 250.0
    clean = _tone(10, sfreq)
    dirty = clean + _tone(50, sfreq)
    filtered = notch(dirty[None, :], sfreq, freq=50.0, q=30.0, harmonics=1)[0]
    before = _band_power(dirty, sfreq, 50)
    after = _band_power(filtered, sfreq, 50)
    signal_before = _band_power(dirty, sfreq, 10)
    signal_after = _band_power(filtered, sfreq, 10)
    assert 10 * np.log10(before / after) > 30
    assert abs(10 * np.log10(signal_after / signal_before)) < 0.5


def test_bandpass_rejects_out_of_band() -> None:
    sfreq = 250.0
    inside = _tone(10, sfreq)
    outside = _tone(40, sfreq)
    mixed = bandpass((inside + outside)[None, :], sfreq, 8, 12)[0]
    assert _band_power(mixed, sfreq, 10) > 10 * _band_power(mixed, sfreq, 40)


def test_bandpass_rejects_invalid_band() -> None:
    with pytest.raises(ValueError):
        bandpass(np.zeros((1, 100)), 100, 40, 10)


def test_car_zero_mean_on_good_channels() -> None:
    x = np.array([[1.0, 1.0], [3.0, 5.0], [100.0, 100.0]])
    referenced = common_average_reference(x, bad_mask=np.array([False, False, True]))
    assert np.allclose(referenced[:2].mean(axis=0), 0)


def test_bin_spikes_counts() -> None:
    counts = bin_spikes([np.array([0.1, 0.3, 1.2])], 0.0, 2.0, 1.0)
    assert counts.shape == (1, 2)
    assert counts.tolist() == [[2, 1]]


def test_zscore_fit_is_not_recomputed_on_transform() -> None:
    train = np.array([[0.0, 2.0]])
    test = np.array([[10.0, 12.0]])
    scaler = ZScore().fit(train)
    transformed = scaler.transform(test)
    assert scaler.mean is not None
    assert np.allclose(transformed, (test - 1.0) / 1.0)


def test_pipeline_hash_changes_with_config() -> None:
    left = Pipeline(PreprocessConfig(notch_freq=50))
    right = Pipeline(PreprocessConfig(notch_freq=60))
    assert left.config_hash() != right.config_hash()
    x = np.random.default_rng(0).normal(size=(2, 500))
    filtered, rate = left.fit_transform(x, 100)
    assert filtered.shape[0] == 2
    assert rate == 100
