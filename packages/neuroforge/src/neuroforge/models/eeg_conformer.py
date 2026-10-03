"""EEG-Conformer: temporal conv, spatial conv, then a pre-norm transformer."""

from __future__ import annotations

import torch
from torch import nn


class EEGConformer(nn.Module):
    def __init__(
        self,
        n_channels: int,
        n_samples: int,
        n_outputs: int,
        d_model: int = 40,
        n_heads: int = 10,
        depth: int = 6,
        dropout: float = 0.5,
        temporal_kernel: int = 25,
        pool_kernel: int = 75,
        pool_stride: int = 15,
    ) -> None:
        super().__init__()
        if d_model % n_heads != 0:
            raise ValueError("d_model must be divisible by n_heads")
        self.n_channels = n_channels
        self.n_samples = n_samples
        self.temporal = nn.Conv2d(
            1,
            d_model,
            (1, temporal_kernel),
            padding=(0, temporal_kernel // 2),
            bias=False,
        )
        self.spatial = nn.Conv2d(d_model, d_model, (n_channels, 1), bias=False)
        self.norm = nn.BatchNorm2d(d_model)
        self.act = nn.ELU()
        self.pool = nn.AvgPool2d((1, pool_kernel), stride=(1, pool_stride))
        self.drop = nn.Dropout(dropout)
        self.project = nn.Conv2d(d_model, d_model, (1, 1))
        with torch.no_grad():
            tokens = self._embed(torch.zeros(1, n_channels, n_samples))
        n_tokens = int(tokens.shape[1])
        if n_tokens == 0:
            raise ValueError(
                f"Temporal pooling removed every sample. n_samples={n_samples} is too short."
            )
        layer = nn.TransformerEncoderLayer(
            d_model=d_model,
            nhead=n_heads,
            dim_feedforward=d_model * 4,
            dropout=dropout,
            activation="gelu",
            batch_first=True,
            norm_first=True,
        )
        self.encoder = nn.TransformerEncoder(layer, num_layers=depth, enable_nested_tensor=False)
        self.head = nn.Linear(d_model, n_outputs)
        self._n_tokens = n_tokens

    def _embed(self, x: torch.Tensor) -> torch.Tensor:
        # x: (batch, channels, samples) -> (batch, tokens, d_model)
        hidden = x.unsqueeze(1)
        hidden = self.temporal(hidden)
        hidden = self.spatial(hidden)
        hidden = self.drop(self.pool(self.act(self.norm(hidden))))
        hidden = self.project(hidden)
        return hidden.squeeze(2).transpose(1, 2)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        tokens = self._embed(x)
        encoded = self.encoder(tokens)
        return self.head(encoded.mean(dim=1))
