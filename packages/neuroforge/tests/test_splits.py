import numpy as np
import pytest

from neuroforge.data.splits import assert_disjoint, group_kfold, train_val_test_split
from neuroforge.data.types import RecordingKey


def _keys() -> list[RecordingKey]:
    return [RecordingKey("ds", f"sub-{i:02d}", "ses-1", "run-1") for i in range(6)]


def test_group_kfold_is_disjoint() -> None:
    folds = list(group_kfold(_keys(), n_splits=3, level="subject"))
    assert len(folds) == 3
    for train_idx, test_idx in folds:
        assert set(train_idx).isdisjoint(set(test_idx))
        assert len(train_idx) + len(test_idx) == 6


def test_deliberate_leak_raises() -> None:
    with pytest.raises(AssertionError, match="Leakage"):
        assert_disjoint({"ds/sub-01"}, {"ds/sub-01", "ds/sub-02"})


def test_holdout_groups_do_not_overlap() -> None:
    keys = _keys()
    train, val, test = train_val_test_split(keys, seed=1)
    groups = [keys[i].group("subject") for i in range(len(keys))]
    train_g = {groups[i] for i in train}
    val_g = {groups[i] for i in val}
    test_g = {groups[i] for i in test}
    assert train_g.isdisjoint(val_g)
    assert train_g.isdisjoint(test_g)
    assert val_g.isdisjoint(test_g)
    assert isinstance(train, np.ndarray)
