import numpy as np
from hypothesis import given
from hypothesis import strategies as st

from neuroforge.data.windowing import event_locked_windows, samples_for, window_starts


@given(
    n_samples=st.integers(min_value=0, max_value=500),
    win=st.integers(min_value=1, max_value=80),
    stride=st.integers(min_value=1, max_value=40),
)
def test_window_starts_stay_inside(n_samples: int, win: int, stride: int) -> None:
    starts = window_starts(n_samples, win, stride)
    assert starts.dtype == np.int64
    if n_samples < win:
        assert starts.size == 0
        return
    assert np.all(starts >= 0)
    assert np.all(starts + win <= n_samples)
    if starts.size > 1:
        assert np.all(np.diff(starts) == stride)


def test_seconds_convert_per_recording() -> None:
    assert samples_for(1.0, 250) == 250
    assert samples_for(0.5, 128) == 64


def test_event_locked_drops_edges() -> None:
    # Windows are [onset + tmin, onset + tmax). Width is 10 samples.
    # onset 0 starts before the recording; onset 96 ends past n_samples.
    starts = event_locked_windows(100, np.array([0, 10, 96]), tmin_samples=-5, tmax_samples=5)
    assert starts.tolist() == [5]
