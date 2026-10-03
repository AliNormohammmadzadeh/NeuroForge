"""Second-order-section filters and a hashable preprocessing pipeline.

Offline training uses zero-phase ``sosfiltfilt``. Real-time inference must use
causal ``sosfilt`` and carry filter state; the ONNX export records that choice.
"""

from __future__ import annotations

import hashlib
import json
from dataclasses import dataclass

import numpy as np
from pydantic import BaseModel
from scipy import signal


class PreprocessConfig(BaseModel):
    l_freq: float | None = 4.0
    h_freq: float | None = 40.0
    order: int = 4
    notch_freq: float | None = 50.0
    notch_q: float = 30.0
    notch_harmonics: int = 2
    car: bool = True
    resample: float | None = None

    def config_hash(self) -> str:
        payload = json.dumps(self.model_dump(), sort_keys=True, separators=(",", ":"))
        return hashlib.sha256(payload.encode()).hexdigest()[:16]


def bandpass(
    x: np.ndarray,
    sfreq: float,
    l_freq: float,
    h_freq: float,
    order: int = 4,
    causal: bool = False,
) -> np.ndarray:
    nyq = sfreq / 2.0
    if not 0 < l_freq < h_freq < nyq:
        raise ValueError(f"Invalid band {l_freq}-{h_freq} Hz for sfreq={sfreq}")
    sos = signal.butter(order, [l_freq, h_freq], btype="bandpass", fs=sfreq, output="sos")
    filtered = signal.sosfilt(sos, x, axis=-1) if causal else signal.sosfiltfilt(sos, x, axis=-1)
    return np.asarray(filtered, dtype=np.float64)


def notch(
    x: np.ndarray,
    sfreq: float,
    freq: float = 50.0,
    q: float = 30.0,
    harmonics: int = 2,
) -> np.ndarray:
    out = np.asarray(x, dtype=np.float64)
    for harmonic in range(1, harmonics + 1):
        f0 = freq * harmonic
        if f0 >= sfreq / 2:
            break
        b, a = signal.iirnotch(f0, q, fs=sfreq)
        out = signal.filtfilt(b, a, out, axis=-1)
    return out


def common_average_reference(x: np.ndarray, bad_mask: np.ndarray | None = None) -> np.ndarray:
    """``x`` is (n_channels, n_samples). Bad channels are excluded from the reference."""
    array = np.asarray(x, dtype=np.float64)
    if bad_mask is None:
        good = np.ones(array.shape[0], dtype=bool)
    else:
        good = ~np.asarray(bad_mask, dtype=bool)
    if not np.any(good):
        raise ValueError("At least one good channel is required for CAR")
    return array - array[good].mean(axis=0, keepdims=True)


def resample_polyphase(
    x: np.ndarray, sfreq: float, target_sfreq: float
) -> tuple[np.ndarray, float]:
    if target_sfreq <= 0:
        raise ValueError("target_sfreq must be positive")
    if np.isclose(sfreq, target_sfreq):
        return np.asarray(x, dtype=np.float64), float(sfreq)
    # Integer up/down factors keep the resampling reproducible across machines.
    from math import gcd

    factor = 1000
    up = int(round(target_sfreq * factor))
    down = int(round(sfreq * factor))
    divisor = gcd(up, down)
    resampled = signal.resample_poly(x, up // divisor, down // divisor, axis=-1)
    return np.asarray(resampled, dtype=np.float64), float(target_sfreq)


def bin_spikes(
    spike_times: list[np.ndarray], t_start: float, t_stop: float, bin_size: float
) -> np.ndarray:
    """Return (n_units, n_bins) int32 spike counts."""
    if bin_size <= 0:
        raise ValueError("bin_size must be positive")
    edges = np.arange(t_start, t_stop + bin_size / 2, bin_size)
    if edges.size < 2:
        raise ValueError("time range must cover at least one bin")
    counts = [np.histogram(np.asarray(times), bins=edges)[0] for times in spike_times]
    if not counts:
        return np.zeros((0, edges.size - 1), dtype=np.int32)
    return np.stack(counts).astype(np.int32)


@dataclass
class ZScore:
    """Channel-wise normalizer. Fit on the training fold only."""

    mean: np.ndarray | None = None
    std: np.ndarray | None = None
    eps: float = 1e-6

    def fit(self, x: np.ndarray) -> ZScore:
        array = np.asarray(x, dtype=np.float64)
        self.mean = array.mean(axis=-1, keepdims=True)
        self.std = array.std(axis=-1, keepdims=True)
        return self

    def transform(self, x: np.ndarray) -> np.ndarray:
        if self.mean is None or self.std is None:
            raise RuntimeError("ZScore.fit must be called before transform")
        array = np.asarray(x, dtype=np.float64)
        return (array - self.mean) / np.maximum(self.std, self.eps)


class Pipeline:
    """Filter chain plus a normalizer whose statistics are fit on train data only."""

    def __init__(self, config: PreprocessConfig) -> None:
        self.config = config
        self.normalizer = ZScore()

    def config_hash(self) -> str:
        return self.config.config_hash()

    def apply_filters(
        self, x: np.ndarray, sfreq: float, bad_mask: np.ndarray | None = None
    ) -> tuple[np.ndarray, float]:
        out = np.asarray(x, dtype=np.float64)
        rate = float(sfreq)
        cfg = self.config
        if cfg.l_freq is not None and cfg.h_freq is not None:
            out = bandpass(out, rate, cfg.l_freq, cfg.h_freq, order=cfg.order)
        if cfg.notch_freq is not None:
            out = notch(
                out,
                rate,
                freq=cfg.notch_freq,
                q=cfg.notch_q,
                harmonics=cfg.notch_harmonics,
            )
        if cfg.car:
            out = common_average_reference(out, bad_mask)
        if cfg.resample is not None:
            out, rate = resample_polyphase(out, rate, cfg.resample)
        return out, rate

    def fit_transform(
        self, x: np.ndarray, sfreq: float, bad_mask: np.ndarray | None = None
    ) -> tuple[np.ndarray, float]:
        filtered, rate = self.apply_filters(x, sfreq, bad_mask)
        self.normalizer.fit(filtered)
        return self.normalizer.transform(filtered), rate

    def transform(
        self, x: np.ndarray, sfreq: float, bad_mask: np.ndarray | None = None
    ) -> tuple[np.ndarray, float]:
        filtered, rate = self.apply_filters(x, sfreq, bad_mask)
        return self.normalizer.transform(filtered), rate
