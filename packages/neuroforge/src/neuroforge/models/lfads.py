"""LFADS-style sequential autoencoder for binned spike counts.

The observation model is Poisson. KL on the initial-condition posterior is
warmed up by the caller via ``kl_weight``. Coordinated dropout is applied to
the encoder inputs so the generator cannot copy the counts.
"""

from __future__ import annotations

import torch
from torch import nn
from torch.nn import functional as F


def lfads_loss(
    log_rates: torch.Tensor,
    counts: torch.Tensor,
    q_mu: torch.Tensor,
    q_logvar: torch.Tensor,
    kl_weight: float,
) -> tuple[torch.Tensor, torch.Tensor, torch.Tensor]:
    recon = F.poisson_nll_loss(log_rates, counts, log_input=True, full=False, reduction="sum")
    kl = -0.5 * torch.sum(1 + q_logvar - q_mu.pow(2) - q_logvar.exp())
    n = counts.shape[0]
    total = (recon + kl_weight * kl) / n
    return total, recon / n, kl / n


class LFADS(nn.Module):
    def __init__(
        self,
        n_neurons: int,
        enc_hidden: int = 64,
        gen_hidden: int = 64,
        factors: int = 16,
        dropout: float = 0.0,
    ) -> None:
        super().__init__()
        self.encoder = nn.GRU(n_neurons, enc_hidden, batch_first=True, bidirectional=True)
        self.to_posterior = nn.Linear(enc_hidden * 2, gen_hidden * 2)
        self.generator = nn.GRUCell(factors, gen_hidden)
        self.factor = nn.Linear(gen_hidden, factors)
        self.rate = nn.Linear(factors, n_neurons)
        self.dropout = dropout
        self.gen_hidden = gen_hidden

    def _posterior(self, counts: torch.Tensor) -> tuple[torch.Tensor, torch.Tensor]:
        dropped = F.dropout(counts, p=self.dropout, training=self.training)
        _, hidden = self.encoder(dropped)
        summary = torch.cat([hidden[0], hidden[1]], dim=-1)
        stats = self.to_posterior(summary)
        mu, logvar = stats.chunk(2, dim=-1)
        return mu, logvar.clamp(-8, 8)

    def _generate(self, g0: torch.Tensor, steps: int) -> torch.Tensor:
        state = g0
        factors = []
        drive = torch.zeros(g0.shape[0], self.factor.out_features, device=g0.device, dtype=g0.dtype)
        for _ in range(steps):
            state = self.generator(drive, state)
            drive = self.factor(state)
            factors.append(drive)
        stacked = torch.stack(factors, dim=1)
        return self.rate(stacked)

    def forward(
        self, counts: torch.Tensor, kl_weight: float = 1.0, inference: bool = False
    ) -> dict[str, torch.Tensor]:
        mu, logvar = self._posterior(counts)
        noise = torch.randn_like(mu) * torch.exp(0.5 * logvar)
        g0 = mu if inference else mu + noise
        log_rates = self._generate(g0, counts.shape[1])
        total, recon, kl = lfads_loss(log_rates, counts, mu, logvar, kl_weight)
        return {"loss": total, "recon": recon, "kl": kl, "log_rates": log_rates, "g0": g0}
