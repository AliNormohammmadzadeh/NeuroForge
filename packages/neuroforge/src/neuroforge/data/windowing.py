"""Window indexes in samples. Callers convert seconds using each recording's rate."""

from __future__ import annotations

import numpy as np


def samples_for(seconds: float, sfreq: float) -> int:
    if seconds < 0 or sfreq <= 0:
        raise ValueError("seconds must be non-negative and sfreq positive")
    return int(round(seconds * sfreq))


def window_starts(n_samples: int, win: int, stride: int, drop_last: bool = True) -> np.ndarray:
    if win <= 0 or stride <= 0:
        raise ValueError("win and stride must be positive")
    if n_samples < win:
        return np.empty(0, dtype=np.int64)
    starts = np.arange(0, n_samples - win + 1, stride, dtype=np.int64)
    if not drop_last and starts.size and int(starts[-1]) + win < n_samples:
        starts = np.append(starts, n_samples - win)
    return starts


def event_locked_windows(
    n_samples: int,
    onsets_sample: np.ndarray,
    tmin_samples: int,
    tmax_samples: int,
) -> np.ndarray:
    """Return start indexes for epochs ``[onset + tmin, onset + tmax)`` that fit."""
    if tmax_samples <= tmin_samples:
        raise ValueError("tmax_samples must be greater than tmin_samples")
    width = tmax_samples - tmin_samples
    starts: list[int] = []
    for onset in np.asarray(onsets_sample, dtype=np.int64):
        start = int(onset) + tmin_samples
        if start >= 0 and start + width <= n_samples:
            starts.append(start)
    return np.asarray(starts, dtype=np.int64)
