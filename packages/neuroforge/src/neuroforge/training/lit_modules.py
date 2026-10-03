"""Lightning modules. Logs use the ``train/`` and ``val/`` prefixes."""

from __future__ import annotations

import lightning as L
import torch
from torch import nn
from torch.nn import functional as F

from neuroforge.training.metrics import accuracy


class ClassificationModule(L.LightningModule):
    def __init__(self, model: nn.Module, lr: float = 1e-3) -> None:
        super().__init__()
        self.model = model
        self.lr = lr

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.model(x)

    def _step(self, batch: tuple[torch.Tensor, torch.Tensor], stage: str) -> torch.Tensor:
        x, y = batch
        logits = self.model(x)
        loss = F.cross_entropy(logits, y)
        self.log(f"{stage}/loss", loss, prog_bar=False)
        self.log(f"{stage}/accuracy", accuracy(logits, y), prog_bar=False)
        return loss

    def training_step(
        self, batch: tuple[torch.Tensor, torch.Tensor], batch_idx: int
    ) -> torch.Tensor:
        del batch_idx
        return self._step(batch, "train")

    def validation_step(
        self, batch: tuple[torch.Tensor, torch.Tensor], batch_idx: int
    ) -> torch.Tensor:
        del batch_idx
        return self._step(batch, "val")

    def configure_optimizers(self) -> torch.optim.Optimizer:
        return torch.optim.AdamW(self.parameters(), lr=self.lr)


class LatentDynamicsModule(L.LightningModule):
    def __init__(self, model: nn.Module, lr: float = 1e-3) -> None:
        super().__init__()
        self.model = model
        self.lr = lr

    def training_step(self, batch: torch.Tensor, batch_idx: int) -> torch.Tensor:
        del batch_idx
        warm = min(1.0, self.current_epoch / 10)
        out = self.model(batch, kl_weight=warm)
        self.log("train/loss", out["loss"])
        self.log("train/recon", out["recon"])
        self.log("train/kl", out["kl"])
        return out["loss"]

    def configure_optimizers(self) -> torch.optim.Optimizer:
        return torch.optim.AdamW(self.parameters(), lr=self.lr)
