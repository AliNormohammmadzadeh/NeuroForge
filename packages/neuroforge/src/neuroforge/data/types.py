"""Canonical containers shared by every reader and model."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Literal

import numpy as np
import numpy.typing as npt

CoordSpace = Literal["MNI152NLin2009cAsym", "fsaverage", "Talairach", "native", "unknown"]


@dataclass(frozen=True, slots=True)
class RecordingKey:
    """Identity used for leakage-safe splitting. Never split below this level."""

    dataset_id: str
    subject_id: str
    session_id: str | None = None
    run_id: str | None = None

    def group(self, level: str) -> str:
        if level == "subject":
            return f"{self.dataset_id}/{self.subject_id}"
        if level == "session":
            return f"{self.dataset_id}/{self.subject_id}/{self.session_id}"
        if level == "run":
            return f"{self.dataset_id}/{self.subject_id}/{self.session_id}/{self.run_id}"
        raise ValueError(f"Unknown split level: {level}")


@dataclass(slots=True)
class ContinuousRecording:
    """EEG / MEG / iEEG / LFP. ``data`` is (n_channels, n_samples)."""

    key: RecordingKey
    data: npt.ArrayLike
    sfreq: float
    ch_names: list[str]
    ch_types: list[str]
    montage: dict[str, tuple[float, float, float]] | None = None
    coord_space: CoordSpace = "unknown"
    units: str = "V"
    events: npt.NDArray[np.float64] | None = None
    event_labels: dict[int, str] = field(default_factory=dict)
    bad_channels: list[str] = field(default_factory=list)
    line_freq: float | None = None

    def validate(self) -> None:
        array = np.asarray(self.data)
        if array.ndim != 2:
            raise ValueError(f"Continuous data must be 2-D, got shape {array.shape}")
        if array.shape[0] != len(self.ch_names):
            raise ValueError("len(ch_names) must equal data.shape[0]")
        if len(self.ch_types) != len(self.ch_names):
            raise ValueError("len(ch_types) must equal len(ch_names)")
        if self.sfreq <= 0:
            raise ValueError(f"sfreq must be positive, got {self.sfreq}")
        if self.units != "V":
            raise ValueError(f"Continuous recordings must be in volts, got {self.units!r}")
        if self.events is not None:
            events = np.asarray(self.events)
            if events.ndim != 2 or events.shape[1] != 3:
                raise ValueError("events must have shape (n_events, 3)")


@dataclass(slots=True)
class SpikeRecording:
    """Sorted units from a Neuropixels or Utah-array session."""

    key: RecordingKey
    spike_times: list[npt.NDArray[np.float64]]
    unit_ids: npt.NDArray[np.int64]
    cluster_quality: list[str] | None = None
    waveforms: npt.NDArray[np.float32] | None = None
    brain_area: list[str] | None = None
    trials: npt.NDArray[np.float64] | None = None
    behavior: dict[str, npt.NDArray[np.float64]] = field(default_factory=dict)

    def validate(self) -> None:
        ids = np.asarray(self.unit_ids)
        if ids.ndim != 1:
            raise ValueError("unit_ids must be 1-D")
        if len(self.spike_times) != ids.shape[0]:
            raise ValueError("spike_times must have one array per unit")
        for times in self.spike_times:
            values = np.asarray(times)
            if values.ndim != 1:
                raise ValueError("each spike-time array must be 1-D")
            if values.size > 1 and np.any(np.diff(values) < 0):
                raise ValueError("spike times must be monotonic")
        if self.trials is not None:
            trials = np.asarray(self.trials)
            if trials.ndim != 2 or trials.shape[1] != 2:
                raise ValueError("trials must have shape (n_trials, 2)")


@dataclass(slots=True)
class Connectome:
    """Structural or functional connectivity on a parcellation."""

    key: RecordingKey
    adjacency: npt.NDArray[np.float32]
    region_labels: list[str]
    parcellation: str
    coords: npt.NDArray[np.float32] | None = None
    coord_space: CoordSpace = "unknown"
    kind: Literal["structural", "functional", "effective"] = "functional"
    node_features: npt.NDArray[np.float32] | None = None

    def validate(self) -> None:
        adjacency = np.asarray(self.adjacency)
        if adjacency.ndim != 2 or adjacency.shape[0] != adjacency.shape[1]:
            raise ValueError("adjacency must be square")
        if adjacency.shape[0] != len(self.region_labels):
            raise ValueError("region_labels length must match adjacency")
        if self.coords is not None and np.asarray(self.coords).shape[0] != len(self.region_labels):
            raise ValueError("coords length must match region_labels")
        if self.node_features is not None and np.asarray(self.node_features).shape[0] != len(
            self.region_labels
        ):
            raise ValueError("node_features length must match region_labels")
