"""PyTorch datasets. Zarr handles are opened inside ``__getitem__`` so workers stay safe."""

from __future__ import annotations

from collections.abc import Iterator, Sequence
from pathlib import Path

import numpy as np
import torch
import zarr
from torch.utils.data import Dataset, IterableDataset, get_worker_info

from neuroforge.data.preprocessing import bin_spikes
from neuroforge.data.types import Connectome, SpikeRecording
from neuroforge.data.windowing import window_starts


class WindowedDataset(Dataset[tuple[torch.Tensor, torch.Tensor]]):
    def __init__(
        self,
        paths: Sequence[Path | str],
        win: int,
        stride: int,
        labels: Sequence[int] | None = None,
    ) -> None:
        self.paths = [Path(path) for path in paths]
        self.win = win
        self.stride = stride
        self.index: list[tuple[int, int]] = []
        for rec_i, path in enumerate(self.paths):
            array = zarr.open(str(path), mode="r")["data"]
            n_samples = int(array.shape[-1])
            for start in window_starts(n_samples, win, stride):
                self.index.append((rec_i, int(start)))
        if labels is None:
            self.labels = [0] * len(self.index)
        else:
            if len(labels) != len(self.index):
                raise ValueError("labels must match the number of windows")
            self.labels = list(labels)

    def __len__(self) -> int:
        return len(self.index)

    def __getitem__(self, idx: int) -> tuple[torch.Tensor, torch.Tensor]:
        rec_i, start = self.index[idx]
        array = zarr.open(str(self.paths[rec_i]), mode="r")["data"]
        window = np.asarray(array[:, start : start + self.win], dtype=np.float32)
        x = torch.from_numpy(window)
        y = torch.tensor(self.labels[idx], dtype=torch.long)
        return x, y


class StreamingWindowDataset(IterableDataset[torch.Tensor]):
    """Shard recordings across workers and shuffle inside a bounded buffer."""

    def __init__(
        self,
        arrays: Sequence[np.ndarray],
        win: int,
        stride: int,
        buffer_size: int = 8,
        seed: int = 0,
    ) -> None:
        super().__init__()
        self.arrays = [np.asarray(array) for array in arrays]
        self.win = win
        self.stride = stride
        self.buffer_size = buffer_size
        self.seed = seed

    def __iter__(self) -> Iterator[torch.Tensor]:
        worker = get_worker_info()
        if worker is None:
            rec_ids = list(range(len(self.arrays)))
            seed = self.seed
        else:
            rec_ids = list(range(worker.id, len(self.arrays), worker.num_workers))
            seed = self.seed + worker.id
        rng = np.random.default_rng(seed)
        buffer: list[torch.Tensor] = []
        for rec_i in rec_ids:
            array = self.arrays[rec_i]
            for start in window_starts(array.shape[-1], self.win, self.stride):
                window = np.asarray(array[:, start : start + self.win], dtype=np.float32)
                buffer.append(torch.from_numpy(window))
                if len(buffer) >= self.buffer_size:
                    choice = int(rng.integers(0, len(buffer)))
                    yield buffer.pop(choice)
        rng.shuffle(buffer)
        yield from buffer


class SpikeTrialDataset(Dataset[tuple[torch.Tensor, torch.Tensor]]):
    def __init__(self, recording: SpikeRecording, bin_size: float) -> None:
        recording.validate()
        if recording.trials is None:
            raise ValueError("SpikeTrialDataset requires trials")
        self.recording = recording
        self.bin_size = bin_size
        self.trials = np.asarray(recording.trials, dtype=np.float64)

    def __len__(self) -> int:
        return int(self.trials.shape[0])

    def __getitem__(self, idx: int) -> tuple[torch.Tensor, torch.Tensor]:
        start, stop = self.trials[idx]
        counts = bin_spikes(
            list(self.recording.spike_times), float(start), float(stop), self.bin_size
        )
        target = np.float32(0.0)
        if self.recording.behavior:
            first = next(iter(self.recording.behavior.values()))
            target = np.float32(np.asarray(first)[idx])
        return torch.from_numpy(counts), torch.tensor(target)


class GraphSample:
    """Minimal graph batch item. Used when torch_geometric is not installed."""

    def __init__(
        self,
        edge_index: torch.Tensor,
        edge_weight: torch.Tensor,
        x: torch.Tensor,
        y: torch.Tensor | None,
    ) -> None:
        self.edge_index = edge_index
        self.edge_weight = edge_weight
        self.x = x
        self.y = y


def _sparsify(adjacency: np.ndarray, top_k_fraction: float) -> tuple[np.ndarray, np.ndarray]:
    n = adjacency.shape[0]
    keep = max(1, int(round(top_k_fraction * (n - 1))))
    rows: list[int] = []
    cols: list[int] = []
    weights: list[float] = []
    for i in range(n):
        row = adjacency[i].copy()
        row[i] = 0
        ranked = np.argsort(np.abs(row))
        chosen = ranked if keep >= n - 1 else ranked[-keep:]
        for j in chosen:
            if row[j] == 0:
                continue
            rows.append(i)
            cols.append(int(j))
            weights.append(float(row[j]))
    if rows:
        edge_index = np.stack([rows, cols], axis=0).astype(np.int64)
    else:
        edge_index = np.zeros((2, 0), np.int64)
    return edge_index, np.asarray(weights, dtype=np.float32)


class ConnectomeDataset(Dataset[GraphSample]):
    def __init__(self, graphs: Sequence[Connectome], top_k_fraction: float = 0.2) -> None:
        for graph in graphs:
            graph.validate()
        self.graphs = list(graphs)
        self.top_k_fraction = top_k_fraction

    def __len__(self) -> int:
        return len(self.graphs)

    def __getitem__(self, idx: int) -> GraphSample:
        graph = self.graphs[idx]
        adjacency = np.asarray(graph.adjacency, dtype=np.float32)
        edge_index, edge_weight = _sparsify(adjacency, self.top_k_fraction)
        features = (
            np.asarray(graph.node_features, dtype=np.float32)
            if graph.node_features is not None
            else adjacency
        )
        return GraphSample(
            edge_index=torch.from_numpy(edge_index),
            edge_weight=torch.from_numpy(edge_weight),
            x=torch.from_numpy(features),
            y=None,
        )
