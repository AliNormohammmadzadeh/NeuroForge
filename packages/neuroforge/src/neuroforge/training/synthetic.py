"""Tiny offline batches. Real datasets stay opt-in so CI never downloads them."""

from __future__ import annotations

import torch


def classification_batch(
    n: int, n_channels: int, n_samples: int, n_classes: int, seed: int = 0
) -> tuple[torch.Tensor, torch.Tensor]:
    generator = torch.Generator().manual_seed(seed)
    x = torch.randn(n, n_channels, n_samples, generator=generator)
    y = torch.randint(0, n_classes, (n,), generator=generator)
    # A class-dependent offset makes the batch separable enough to overfit.
    for cls in range(n_classes):
        x[y == cls, :, :8] += cls + 1
    return x, y


def spike_batch(n: int, steps: int, n_neurons: int, seed: int = 0) -> torch.Tensor:
    generator = torch.Generator().manual_seed(seed)
    rates = torch.rand(n, 1, n_neurons, generator=generator) + 0.2
    return torch.poisson(rates.expand(n, steps, n_neurons))


def connectome_batch(
    n: int, n_regions: int, n_classes: int, seed: int = 0
) -> tuple[torch.Tensor, torch.Tensor]:
    generator = torch.Generator().manual_seed(seed)
    adjacency = torch.rand(n, n_regions, n_regions, generator=generator)
    adjacency = 0.5 * (adjacency + adjacency.transpose(-1, -2))
    y = torch.randint(0, n_classes, (n,), generator=generator)
    for cls in range(n_classes):
        adjacency[y == cls, :4, :4] += cls
    return adjacency, y
