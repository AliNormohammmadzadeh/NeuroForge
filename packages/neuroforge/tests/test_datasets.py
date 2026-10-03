import numpy as np
import torch
from torch.utils.data import DataLoader

from neuroforge.data.datasets import ConnectomeDataset, SpikeTrialDataset, WindowedDataset
from neuroforge.data.store import ZarrCache
from neuroforge.data.types import Connectome, ContinuousRecording, RecordingKey, SpikeRecording


def test_windowed_dataset_is_deterministic(tmp_path) -> None:
    cache = ZarrCache(tmp_path)
    data = np.arange(40, dtype=np.float32).reshape(2, 20)
    rec = ContinuousRecording(
        key=RecordingKey("ds", "sub-01", "ses-1", "run-1"),
        data=data,
        sfreq=10.0,
        ch_names=["a", "b"],
        ch_types=["eeg", "eeg"],
    )
    path = cache.write(rec, "hash")
    dataset = WindowedDataset([path], win=4, stride=4)
    loader = DataLoader(dataset, batch_size=2, shuffle=False)
    first = next(iter(loader))[0]
    again = next(iter(DataLoader(dataset, batch_size=2, shuffle=False)))[0]
    assert torch.equal(first, again)
    assert first.shape == (2, 2, 4)


def test_spike_trials_and_connectome() -> None:
    spikes = SpikeRecording(
        key=RecordingKey("ds", "sub-01"),
        spike_times=[np.array([0.1, 0.2]), np.array([0.6])],
        unit_ids=np.array([1, 2]),
        trials=np.array([[0.0, 0.5], [0.5, 1.0]]),
        behavior={"target": np.array([1.0, 0.0])},
    )
    trial = SpikeTrialDataset(spikes, bin_size=0.5)[0]
    assert trial[0].shape[0] == 2

    graph = Connectome(
        key=RecordingKey("ds", "sub-01"),
        adjacency=np.eye(4, dtype=np.float32) + 0.2,
        region_labels=["a", "b", "c", "d"],
        parcellation="toy",
    )
    sample = ConnectomeDataset([graph], top_k_fraction=0.5)[0]
    assert sample.edge_index.shape[0] == 2
    assert sample.x.shape[0] == 4
