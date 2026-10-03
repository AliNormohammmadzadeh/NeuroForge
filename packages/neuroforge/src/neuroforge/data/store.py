"""Chunked local caches. A changed preprocessing hash invalidates the store.

Directory stores use zarr 2 with Blosc/Zstd bitshuffle. zarr 3's codec metadata
does not yet match that layout, so the cache stays on the v2 format readers can
open without a conversion step.
"""

from __future__ import annotations

import json
from pathlib import Path

import h5py
import numpy as np
import zarr
from numcodecs import Blosc

from neuroforge.data.types import ContinuousRecording, RecordingKey


def _relative(key: RecordingKey) -> Path:
    session = key.session_id or "none"
    run = key.run_id or "none"
    return Path(key.dataset_id) / key.subject_id / session / run


def _chunk_samples(sfreq: float) -> int:
    return max(1, int(round(sfreq * 2)))


class CacheInvalidError(Exception):
    """Raised when a store was written with a different preprocessing hash."""


class ZarrCache:
    def __init__(self, cache_dir: Path | str) -> None:
        self.cache_dir = Path(cache_dir)

    def path_for(self, key: RecordingKey) -> Path:
        return self.cache_dir / _relative(key).with_suffix(".zarr")

    def write(self, recording: ContinuousRecording, config_hash: str) -> Path:
        recording.validate()
        data = np.asarray(recording.data)
        path = self.path_for(recording.key)
        path.parent.mkdir(parents=True, exist_ok=True)
        chunk_t = min(_chunk_samples(recording.sfreq), data.shape[-1])
        compressor = Blosc(cname="zstd", clevel=5, shuffle=Blosc.BITSHUFFLE)
        store = zarr.open(str(path), mode="w")
        array = store.create_dataset(
            "data",
            data=data,
            chunks=(data.shape[0], chunk_t),
            compressor=compressor,
            dtype=data.dtype,
        )
        del array
        manifest = {
            "config_hash": config_hash,
            "sfreq": recording.sfreq,
            "ch_names": recording.ch_names,
            "units": recording.units,
            "shape": list(data.shape),
        }
        (path / "manifest.json").write_text(json.dumps(manifest), encoding="utf-8")
        return path

    def read(self, key: RecordingKey, config_hash: str) -> np.ndarray:
        path = self.path_for(key)
        manifest_path = path / "manifest.json"
        if not manifest_path.exists():
            raise FileNotFoundError(path)
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
        if manifest["config_hash"] != config_hash:
            raise CacheInvalidError(
                f"Cache hash {manifest['config_hash']} != requested {config_hash}"
            )
        store = zarr.open(str(path), mode="r")
        return np.asarray(store["data"])


class HDF5Cache:
    def __init__(self, cache_dir: Path | str) -> None:
        self.cache_dir = Path(cache_dir)

    def path_for(self, key: RecordingKey) -> Path:
        return self.cache_dir / _relative(key).with_suffix(".h5")

    def write(self, recording: ContinuousRecording, config_hash: str) -> Path:
        recording.validate()
        data = np.asarray(recording.data)
        path = self.path_for(recording.key)
        path.parent.mkdir(parents=True, exist_ok=True)
        chunk_t = min(_chunk_samples(recording.sfreq), data.shape[-1])
        with h5py.File(path, "w") as handle:
            handle.create_dataset(
                "data",
                data=data,
                chunks=(data.shape[0], chunk_t),
                compression="gzip",
                compression_opts=4,
            )
            handle.attrs["config_hash"] = config_hash
            handle.attrs["sfreq"] = recording.sfreq
        return path

    def read(self, key: RecordingKey, config_hash: str) -> np.ndarray:
        path = self.path_for(key)
        with h5py.File(path, "r") as handle:
            stored = handle.attrs["config_hash"]
            if stored != config_hash:
                raise CacheInvalidError(f"Cache hash {stored} != requested {config_hash}")
            return np.asarray(handle["data"])
