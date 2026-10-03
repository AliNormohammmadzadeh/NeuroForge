import numpy as np
import pytest

from neuroforge.data.store import HDF5Cache, ZarrCache
from neuroforge.data.types import Connectome, ContinuousRecording, RecordingKey, SpikeRecording


def _recording() -> ContinuousRecording:
    rng = np.random.default_rng(0)
    rec = ContinuousRecording(
        key=RecordingKey("ds", "sub-01", "ses-1", "run-1"),
        data=rng.normal(size=(4, 40)).astype(np.float32),
        sfreq=20.0,
        ch_names=["a", "b", "c", "d"],
        ch_types=["eeg"] * 4,
    )
    rec.validate()
    return rec


def test_continuous_validation() -> None:
    rec = _recording()
    rec.sfreq = 0
    with pytest.raises(ValueError):
        rec.validate()


def test_spike_times_must_be_monotonic() -> None:
    rec = SpikeRecording(
        key=RecordingKey("ds", "sub-01"),
        spike_times=[np.array([0.2, 0.1])],
        unit_ids=np.array([1]),
    )
    with pytest.raises(ValueError):
        rec.validate()


def test_connectome_must_be_square() -> None:
    rec = Connectome(
        key=RecordingKey("ds", "sub-01"),
        adjacency=np.ones((2, 3), dtype=np.float32),
        region_labels=["a", "b", "c"],
        parcellation="test",
    )
    with pytest.raises(ValueError):
        rec.validate()


@pytest.mark.parametrize("cache_cls", [ZarrCache, HDF5Cache])
def test_cache_roundtrip_and_hash(tmp_path, cache_cls: type) -> None:
    cache = cache_cls(tmp_path)
    rec = _recording()
    cache.write(rec, "abc")
    got = cache.read(rec.key, "abc")
    assert np.allclose(got, np.asarray(rec.data))
    with pytest.raises(Exception, match="hash"):
        cache.read(rec.key, "other")
