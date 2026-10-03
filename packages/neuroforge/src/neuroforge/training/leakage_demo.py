"""A subject shortcut: splitting windows looks solved, holding out subjects does not.

Each person has one class, and every window carries that person's signature.
A split that reuses the person can name the class from the signature.
A split that holds the person out never saw the signature, so the score falls
to the chance level of a model that only learned the training people.
"""

from __future__ import annotations

from typing import Any

import numpy as np
import torch
from torch import nn
from torch.nn import functional as F

from neuroforge.data.splits import assert_disjoint
from neuroforge.data.types import RecordingKey


def shortcut_windows(
    n_subjects: int = 8,
    windows_per_subject: int = 16,
    noise: float = 0.05,
    seed: int = 0,
) -> tuple[list[RecordingKey], np.ndarray, np.ndarray]:
    """Windows whose only class cue is which subject they came from."""
    if n_subjects < 4:
        raise ValueError("Need at least four subjects so two can be held out")
    if windows_per_subject < 2:
        raise ValueError("Need at least two windows per subject")
    rng = np.random.default_rng(seed)
    keys: list[RecordingKey] = []
    rows: list[np.ndarray] = []
    labels: list[int] = []
    for subject in range(n_subjects):
        signature = np.zeros(n_subjects, dtype=np.float32)
        signature[subject] = 1.0
        label = subject % 2
        for _ in range(windows_per_subject):
            keys.append(RecordingKey(dataset_id="shortcut", subject_id=f"sub-{subject:02d}"))
            rows.append(signature + rng.normal(0, noise, size=n_subjects).astype(np.float32))
            labels.append(label)
    return keys, np.stack(rows), np.asarray(labels, dtype=np.int64)


def window_split(keys: list[RecordingKey]) -> tuple[np.ndarray, np.ndarray]:
    """Put half of every subject's windows on each side. The groups overlap."""
    by_subject: dict[str, list[int]] = {}
    for index, key in enumerate(keys):
        by_subject.setdefault(key.subject_id, []).append(index)
    train: list[int] = []
    test: list[int] = []
    for indexes in by_subject.values():
        mid = len(indexes) // 2
        train.extend(indexes[:mid])
        test.extend(indexes[mid:])
    return np.asarray(train, dtype=np.int64), np.asarray(test, dtype=np.int64)


def subject_split(keys: list[RecordingKey]) -> tuple[np.ndarray, np.ndarray]:
    """Hold out the last two subjects. The two sides share no subject."""
    subjects = sorted({key.subject_id for key in keys})
    test_subjects = set(subjects[-2:])
    train_subjects = set(subjects[:-2])
    assert_disjoint(train_subjects, test_subjects)
    train = np.asarray(
        [index for index, key in enumerate(keys) if key.subject_id in train_subjects],
        dtype=np.int64,
    )
    test = np.asarray(
        [index for index, key in enumerate(keys) if key.subject_id in test_subjects],
        dtype=np.int64,
    )
    return train, test


def _shared_subjects(keys: list[RecordingKey], train: np.ndarray, test: np.ndarray) -> int:
    train_subjects = {keys[int(index)].subject_id for index in train}
    test_subjects = {keys[int(index)].subject_id for index in test}
    return len(train_subjects & test_subjects)


def _fit_accuracy(
    features: np.ndarray,
    labels: np.ndarray,
    train: np.ndarray,
    test: np.ndarray,
    *,
    steps: int,
    seed: int,
) -> float:
    torch.manual_seed(seed)
    model = nn.Linear(features.shape[1], 2)
    nn.init.zeros_(model.weight)
    nn.init.zeros_(model.bias)
    optimizer = torch.optim.Adam(model.parameters(), lr=0.2)
    x_train = torch.from_numpy(features[train])
    y_train = torch.from_numpy(labels[train])
    model.train()
    for _ in range(steps):
        optimizer.zero_grad(set_to_none=True)
        loss: Any = F.cross_entropy(model(x_train), y_train)
        loss.backward()
        optimizer.step()
    model.eval()
    with torch.no_grad():
        logits = model(torch.from_numpy(features[test]))
    predicted = logits.argmax(dim=-1).numpy()
    return float((predicted == labels[test]).mean())


def run_leakage_demo(seed: int = 0, steps: int = 80) -> dict[str, float]:
    """Train the same linear decoder on a leaky window split and a subject split."""
    keys, features, labels = shortcut_windows(seed=seed)
    leaky_train, leaky_test = window_split(keys)
    safe_train, safe_test = subject_split(keys)
    leaky = _fit_accuracy(features, labels, leaky_train, leaky_test, steps=steps, seed=seed)
    safe = _fit_accuracy(features, labels, safe_train, safe_test, steps=steps, seed=seed)
    return {
        "leaky_accuracy": leaky,
        "safe_accuracy": safe,
        "leaky_shared_subjects": float(_shared_subjects(keys, leaky_train, leaky_test)),
        "safe_shared_subjects": float(_shared_subjects(keys, safe_train, safe_test)),
        "n_subjects": 8.0,
        "steps": float(steps),
        "seed": float(seed),
    }
