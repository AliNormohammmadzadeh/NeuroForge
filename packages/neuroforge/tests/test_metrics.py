import math

import torch

from neuroforge.training.metrics import (
    accuracy,
    co_bps,
    cohen_kappa,
    pearson_r,
    poisson_ll,
    roc_auc,
)


def test_accuracy_and_kappa() -> None:
    logits = torch.tensor([[5.0, 0.0], [0.0, 4.0], [3.0, 0.0]])
    target = torch.tensor([0, 1, 1])
    assert torch.isclose(accuracy(logits, target), torch.tensor(2 / 3))
    perfect = torch.tensor([[4.0, 0.0], [0.0, 4.0]])
    kappa = cohen_kappa(perfect, torch.tensor([0, 1]), 2)
    assert torch.isclose(kappa, torch.tensor(1.0, dtype=torch.float64))


def test_roc_auc_known_ranking() -> None:
    scores = torch.tensor([0.1, 0.4, 0.35, 0.8])
    labels = torch.tensor([0, 0, 1, 1])
    # Pairs: 0.35>0.1, 0.35<0.4, 0.8>0.1, 0.8>0.4 -> 3/4
    assert torch.isclose(roc_auc(scores, labels), torch.tensor(0.75, dtype=torch.float64))


def test_pearson_extremes() -> None:
    target = torch.tensor([[1.0, 2.0], [3.0, 4.0], [5.0, 6.0]])
    assert torch.isclose(pearson_r(target, target), torch.tensor(1.0))
    flipped = torch.tensor([[5.0, 6.0], [3.0, 4.0], [1.0, 2.0]])
    assert pearson_r(flipped, target) < 0


def test_co_bps_matches_manual_value() -> None:
    counts = torch.tensor([[[0.0], [2.0]]])
    pred = counts.clone()
    manual_model = poisson_ll(pred, counts)
    null = counts.mean(dim=(0, 1), keepdim=True).expand_as(counts)
    manual_null = poisson_ll(null, counts)
    expected = float((manual_model - manual_null) / (counts.sum() * math.log(2)))
    assert co_bps(pred, counts) == expected
    assert co_bps(pred, counts) > 0
    assert abs(co_bps(null, counts)) < 1e-6
