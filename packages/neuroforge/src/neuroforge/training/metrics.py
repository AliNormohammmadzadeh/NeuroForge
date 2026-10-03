"""Decoding metrics. ``co_bps`` is bits per spike above a mean-rate Poisson baseline."""

from __future__ import annotations

import math

import torch


def accuracy(pred: torch.Tensor, target: torch.Tensor) -> torch.Tensor:
    return (pred.argmax(dim=-1) == target).float().mean()


def cohen_kappa(pred: torch.Tensor, target: torch.Tensor, n_classes: int) -> torch.Tensor:
    pred_cls = pred.argmax(dim=-1)
    confusion = torch.zeros(n_classes, n_classes, dtype=torch.float64)
    for i in range(n_classes):
        for j in range(n_classes):
            confusion[i, j] = torch.sum((target == i) & (pred_cls == j))
    total = confusion.sum().clamp_min(1)
    observed = confusion.diag().sum() / total
    expected = (confusion.sum(0) * confusion.sum(1)).sum() / (total * total)
    return (observed - expected) / (1 - expected).clamp_min(1e-12)


def roc_auc(scores: torch.Tensor, target: torch.Tensor) -> torch.Tensor:
    """Binary AUC via the rank statistic.

    ``target`` is 0/1 and ``scores`` are positive-class scores.
    """
    labels = target.to(dtype=torch.long)
    pos = scores[labels == 1]
    neg = scores[labels == 0]
    if pos.numel() == 0 or neg.numel() == 0:
        raise ValueError("roc_auc needs both classes")
    correct = 0.0
    for value in pos:
        correct += torch.sum(value > neg).item()
        correct += 0.5 * torch.sum(value == neg).item()
    return torch.tensor(correct / (pos.numel() * neg.numel()), dtype=torch.float64)


def pearson_r(pred: torch.Tensor, target: torch.Tensor) -> torch.Tensor:
    """``(n, d)`` tensors. Returns the mean correlation over the last dimension."""
    pred_c = pred - pred.mean(0)
    target_c = target - target.mean(0)
    denom = (pred_c.norm(dim=0) * target_c.norm(dim=0)).clamp_min(1e-12)
    return ((pred_c * target_c).sum(0) / denom).mean()


def poisson_ll(rates: torch.Tensor, counts: torch.Tensor) -> torch.Tensor:
    safe = rates.clamp_min(1e-9)
    return (counts * torch.log(safe) - safe - torch.lgamma(counts + 1)).sum()


def co_bps(pred_rates: torch.Tensor, heldout_counts: torch.Tensor) -> float:
    """``pred_rates`` and ``heldout_counts`` are (trials, time, neurons), rates in counts/bin."""
    null_rates = heldout_counts.mean(dim=(0, 1), keepdim=True).expand_as(heldout_counts)
    ll_model = poisson_ll(pred_rates, heldout_counts)
    ll_null = poisson_ll(null_rates, heldout_counts)
    n_spikes = heldout_counts.sum().clamp_min(1)
    return float((ll_model - ll_null) / (n_spikes * math.log(2)))
