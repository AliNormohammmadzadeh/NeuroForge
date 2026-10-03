"""Edge-weighted graph network for connectivity matrices.

Implemented in pure PyTorch so the library installs without torch_geometric.
Node features default to the connectivity row, which is the usual ABIDE setup.
"""

from __future__ import annotations

import torch
from torch import nn


class _EdgeGCN(nn.Module):
    def __init__(self, in_features: int, out_features: int) -> None:
        super().__init__()
        self.linear = nn.Linear(in_features, out_features)

    def forward(self, adjacency: torch.Tensor, features: torch.Tensor) -> torch.Tensor:
        degree = adjacency.sum(dim=-1).clamp_min(1).unsqueeze(-1)
        propagated = torch.matmul(adjacency, features) / degree
        return self.linear(propagated)


class BrainGNN(nn.Module):
    def __init__(
        self,
        n_regions: int,
        n_outputs: int,
        hidden: int = 32,
        top_k: int = 16,
        in_features: int | None = None,
    ) -> None:
        super().__init__()
        features = n_regions if in_features is None else in_features
        self.gcn1 = _EdgeGCN(features, hidden)
        self.gcn2 = _EdgeGCN(hidden, hidden)
        self.score = nn.Linear(hidden, 1)
        self.top_k = min(top_k, n_regions)
        self.head = nn.Sequential(
            nn.Linear(hidden * 2, hidden),
            nn.ELU(),
            nn.Linear(hidden, n_outputs),
        )

    def forward(
        self, adjacency: torch.Tensor, node_features: torch.Tensor | None = None
    ) -> torch.Tensor:
        features = adjacency if node_features is None else node_features
        # Zero the diagonal so a region does not message itself twice.
        eye = torch.eye(adjacency.shape[-1], device=adjacency.device, dtype=adjacency.dtype)
        weights = adjacency.abs() * (1 - eye)
        hidden = torch.nn.functional.elu(self.gcn1(weights, features))
        hidden = torch.nn.functional.elu(self.gcn2(weights, hidden))
        scores = self.score(hidden).squeeze(-1)
        k = min(self.top_k, hidden.shape[1])
        index = scores.topk(k, dim=-1).indices
        gathered = torch.gather(hidden, 1, index.unsqueeze(-1).expand(-1, -1, hidden.shape[-1]))
        pooled = torch.cat([gathered.mean(dim=1), gathered.max(dim=1).values], dim=-1)
        return self.head(pooled)
