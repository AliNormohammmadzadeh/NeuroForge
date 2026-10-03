"""Format readers. Both return the canonical containers and convert to volts."""

from __future__ import annotations

from pathlib import Path
from typing import Any

import numpy as np

from neuroforge.data.types import ContinuousRecording, RecordingKey, SpikeRecording

_UV_TO_V = 1e-6


def _to_volts(data: np.ndarray, unit: str) -> np.ndarray:
    normalized = unit.strip().lower().replace("µ", "u")
    if normalized in {"v", "volt", "volts"}:
        return np.asarray(data, dtype=np.float64)
    if normalized in {"uv", "uvolt", "uvolts", "microvolt", "microvolts"}:
        return np.asarray(data, dtype=np.float64) * _UV_TO_V
    raise ValueError(f"Unsupported channel unit {unit!r}; expected V or µV")


def recording_from_mne(raw: Any, key: RecordingKey) -> ContinuousRecording:
    """Convert an MNE ``Raw`` to a ``ContinuousRecording`` in volts."""
    get_data = raw.get_data
    info = raw.info
    data = np.asarray(get_data(), dtype=np.float64)
    ch_names = [str(name) for name in info["ch_names"]]
    ch_types = [str(info.get_channel_types()[i]) for i in range(len(ch_names))]
    bad = [str(name) for name in info["bads"]]
    events = None
    annotations = getattr(raw, "annotations", None)
    if annotations is not None and len(annotations) > 0:
        onsets = np.asarray(annotations.onset, dtype=np.float64)
        durations = np.asarray(annotations.duration, dtype=np.float64)
        # Descriptions that look like integers become event codes; others map stably.
        codes: list[float] = []
        labels: dict[int, str] = {}
        for description in annotations.description:
            text = str(description)
            try:
                code = int(text)
            except ValueError:
                code = len(labels) + 1
            labels[code] = text
            codes.append(float(code))
        events = np.column_stack([onsets, durations, codes])
    recording = ContinuousRecording(
        key=key,
        data=data,
        sfreq=float(info["sfreq"]),
        ch_names=ch_names,
        ch_types=ch_types,
        units="V",
        events=events,
        bad_channels=bad,
        line_freq=float(info["line_freq"]) if info.get("line_freq") else None,
    )
    recording.validate()
    return recording


class BIDSReader:
    """Read a BIDS root into ``ContinuousRecording`` objects.

    Data stay as memory-mapped MNE arrays until ``get_data`` is called by the
    caller. This reader does not preload an entire dataset at construction.
    """

    def __init__(self, root: Path | str) -> None:
        self.root = Path(root)

    def recordings(self) -> list[ContinuousRecording]:
        from mne_bids import find_matching_paths, read_raw_bids

        # ``subjects=None`` matches every subject. The string ``"all"`` is a subject id.
        # Keep header files that ``read_raw_bids`` can open. BrainVision data is the
        # ``.eeg`` payload; the readable path is the ``.vhdr`` header.
        paths = find_matching_paths(
            root=self.root,
            datatypes=["eeg", "ieeg", "meg"],
            suffixes=["eeg", "ieeg", "meg"],
        )
        readable = {".vhdr", ".edf", ".bdf", ".fif", ".set"}
        found: list[ContinuousRecording] = []
        for bids_path in paths:
            if bids_path.extension not in readable:
                continue
            raw = read_raw_bids(bids_path, verbose=False)
            key = RecordingKey(
                dataset_id=self.root.name,
                subject_id=str(bids_path.subject),
                session_id=None if bids_path.session is None else str(bids_path.session),
                run_id=None if bids_path.run is None else str(bids_path.run),
            )
            found.append(recording_from_mne(raw, key))
        return found


def _electrical_series_to_recording(series: Any, key: RecordingKey) -> ContinuousRecording:
    data = np.asarray(series.data, dtype=np.float64)
    # NWB ElectricalSeries is (time, channels). Canonical layout is (channels, time).
    if data.ndim != 2:
        raise ValueError("ElectricalSeries data must be 2-D")
    conversion = float(getattr(series, "conversion", 1.0) or 1.0)
    offset = float(getattr(series, "offset", 0.0) or 0.0)
    volts = (data * conversion) + offset
    unit = str(getattr(series, "unit", "volts"))
    volts = _to_volts(volts, unit if conversion == 1.0 else "V")
    electrodes = series.electrodes
    table = electrodes.table
    idx = np.asarray(electrodes.data)
    ch_names = []
    for i, row in enumerate(idx):
        label = ""
        if "label" in table.colnames:
            label = str(table["label"][row])
        # Electrode group names are shared by a shank, so they are not channel ids.
        ch_names.append(label or f"ch{i}")
    rate = getattr(series, "rate", None)
    if rate is None:
        timestamps = np.asarray(series.timestamps)
        rate = 1.0 / float(np.median(np.diff(timestamps)))
    recording = ContinuousRecording(
        key=key,
        data=volts.T,
        sfreq=float(rate),
        ch_names=ch_names,
        ch_types=["ecog"] * len(ch_names),
        units="V",
    )
    recording.validate()
    return recording


class NWBReader:
    """Open a local ``.nwb`` file. Remote streaming lives in ``remote.py``."""

    def __init__(self, path: Path | str) -> None:
        self.path = Path(path)

    def continuous(self, key: RecordingKey) -> list[ContinuousRecording]:
        from pynwb import NWBHDF5IO

        with NWBHDF5IO(str(self.path), "r", load_namespaces=True) as io:
            nwb = io.read()
            series = []
            for container in (nwb.acquisition, nwb.processing):
                series.extend(_iter_electrical(container))
            return [_electrical_series_to_recording(item, key) for item in series]

    def spikes(self, key: RecordingKey) -> SpikeRecording | None:
        from pynwb import NWBHDF5IO

        with NWBHDF5IO(str(self.path), "r", load_namespaces=True) as io:
            nwb = io.read()
            if nwb.units is None or len(nwb.units) == 0:
                return None
            units = nwb.units
            ids = np.asarray(units.id[:], dtype=np.int64)
            spike_times = [np.asarray(times, dtype=np.float64) for times in units["spike_times"][:]]
            quality = None
            if "quality" in units.colnames:
                quality = [str(item) for item in units["quality"][:]]
            trials = None
            if nwb.trials is not None and len(nwb.trials) > 0:
                starts = np.asarray(nwb.trials["start_time"][:], dtype=np.float64)
                stops = np.asarray(nwb.trials["stop_time"][:], dtype=np.float64)
                trials = np.column_stack([starts, stops])
            recording = SpikeRecording(
                key=key,
                spike_times=spike_times,
                unit_ids=ids,
                cluster_quality=quality,
                trials=trials,
            )
            recording.validate()
            return recording


def _iter_electrical(container: object) -> list[object]:
    found: list[object] = []
    values = getattr(container, "values", None)
    if values is None:
        return found
    for item in values():
        if item.__class__.__name__ == "ElectricalSeries":
            found.append(item)
        elif hasattr(item, "data_interfaces"):
            found.extend(_iter_electrical(item.data_interfaces))
    return found
