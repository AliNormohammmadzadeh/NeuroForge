"""Typed model zoo. Every module accepts the canonical tensor layout for its modality."""

from neuroforge.models.brain_gnn import BrainGNN
from neuroforge.models.eeg_conformer import EEGConformer
from neuroforge.models.lfads import LFADS
from neuroforge.models.tcn import TCN

__all__ = ["BrainGNN", "EEGConformer", "LFADS", "TCN"]
