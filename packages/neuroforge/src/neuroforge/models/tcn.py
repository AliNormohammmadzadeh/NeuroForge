"""Causal temporal convolutional network for real-time decoding."""

from __future__ import annotations

import torch
from torch import nn
from torch.nn.utils.parametrizations import weight_norm


class _CausalBlock(nn.Module):
    def __init__(
        self,
        in_channels: int,
        out_channels: int,
        kernel: int,
        dilation: int,
        dropout: float,
    ) -> None:
        super().__init__()
        padding = (kernel - 1) * dilation
        self.chomp = padding
        self.conv1 = weight_norm(
            nn.Conv1d(in_channels, out_channels, kernel, padding=padding, dilation=dilation)
        )
        self.conv2 = weight_norm(
            nn.Conv1d(out_channels, out_channels, kernel, padding=padding, dilation=dilation)
        )
        self.act = nn.ReLU()
        self.drop = nn.Dropout(dropout)
        if in_channels != out_channels:
            self.residual: nn.Module = nn.Conv1d(in_channels, out_channels, 1)
        else:
            self.residual = nn.Identity()

    def _conv(self, conv: nn.Module, x: torch.Tensor) -> torch.Tensor:
        out = conv(x)
        if self.chomp:
            out = out[..., : -self.chomp]
        return self.drop(self.act(out))

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        hidden = self._conv(self.conv2, self._conv(self.conv1, x))
        return self.act(hidden + self.residual(x))


class TCN(nn.Module):
    def __init__(
        self,
        n_channels: int,
        n_outputs: int,
        hidden: int = 32,
        levels: int = 4,
        kernel: int = 3,
        dropout: float = 0.1,
    ) -> None:
        super().__init__()
        blocks: list[nn.Module] = []
        in_ch = n_channels
        for level in range(levels):
            blocks.append(_CausalBlock(in_ch, hidden, kernel, 2**level, dropout))
            in_ch = hidden
        self.blocks = nn.Sequential(*blocks)
        self.head = nn.Linear(hidden, n_outputs)
        self.kernel = kernel
        self.levels = levels

    @property
    def receptive_field(self) -> int:
        # Two causal convolutions per level, dilations 1, 2, 4, ...
        span = sum(2**level for level in range(self.levels))
        return 1 + 2 * (self.kernel - 1) * span

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        hidden = self.blocks(x)
        return self.head(hidden[..., -1])
