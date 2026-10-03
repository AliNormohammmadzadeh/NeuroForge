"""Splits over ``RecordingKey`` that refuse to leak a subject into both sides."""

from __future__ import annotations

from collections.abc import Iterator

import numpy as np
from sklearn.model_selection import GroupKFold

from neuroforge.data.types import RecordingKey


def _groups(keys: list[RecordingKey], level: str) -> list[str]:
    return [key.group(level) for key in keys]


def assert_disjoint(train_groups: set[str], test_groups: set[str]) -> None:
    overlap = train_groups & test_groups
    if overlap:
        raise AssertionError(f"Leakage: {overlap}")


def group_kfold(
    keys: list[RecordingKey], n_splits: int, level: str = "subject"
) -> Iterator[tuple[np.ndarray, np.ndarray]]:
    """Yield train/test indexes. Groups are disjoint at ``level`` on every fold."""
    if n_splits < 2:
        raise ValueError("n_splits must be at least 2")
    groups = _groups(keys, level)
    n_groups = len(set(groups))
    if n_splits > n_groups:
        raise ValueError(f"n_splits={n_splits} exceeds {n_groups} groups at level {level!r}")
    dummy = np.zeros(len(keys))
    for train_idx, test_idx in GroupKFold(n_splits=n_splits).split(dummy, groups=groups):
        train_groups = {groups[i] for i in train_idx}
        test_groups = {groups[i] for i in test_idx}
        assert_disjoint(train_groups, test_groups)
        yield train_idx, test_idx


def train_val_test_split(
    keys: list[RecordingKey],
    *,
    level: str = "subject",
    val_fraction: float = 0.2,
    test_fraction: float = 0.2,
    seed: int = 0,
) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    """Hold out whole groups. Fractions are of groups, not of windows."""
    if not 0 < val_fraction < 1 or not 0 < test_fraction < 1:
        raise ValueError("fractions must be in (0, 1)")
    if val_fraction + test_fraction >= 1:
        raise ValueError("val_fraction + test_fraction must be < 1")
    groups = _groups(keys, level)
    unique = np.array(sorted(set(groups)))
    rng = np.random.default_rng(seed)
    rng.shuffle(unique)
    n_test = max(1, int(round(len(unique) * test_fraction)))
    n_val = max(1, int(round(len(unique) * val_fraction)))
    if n_test + n_val >= len(unique):
        raise ValueError("Not enough groups to form train, val, and test")
    test_g = set(unique[:n_test])
    val_g = set(unique[n_test : n_test + n_val])
    train_g = set(unique[n_test + n_val :])
    assert_disjoint(train_g, val_g)
    assert_disjoint(train_g, test_g)
    assert_disjoint(val_g, test_g)

    def indexes(selected: set[str]) -> np.ndarray:
        return np.array([i for i, group in enumerate(groups) if group in selected], dtype=np.int64)

    return indexes(train_g), indexes(val_g), indexes(test_g)
