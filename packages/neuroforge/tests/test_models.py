import torch
from torch.nn import functional as F

from neuroforge.models import LFADS, TCN, BrainGNN, EEGConformer
from neuroforge.training.cli import train_smoke
from neuroforge.training.export import export_onnx, parity_error, write_preprocessing_sidecar
from neuroforge.training.synthetic import classification_batch, connectome_batch, spike_batch


def test_shapes() -> None:
    x, _ = classification_batch(4, 8, 64, 2)
    conformer = EEGConformer(
        8,
        64,
        2,
        d_model=16,
        n_heads=4,
        depth=1,
        dropout=0.0,
        temporal_kernel=5,
        pool_kernel=4,
        pool_stride=2,
    )
    tcn = TCN(8, 2, hidden=8, levels=2, dropout=0.0)
    assert conformer(x).shape == (4, 2)
    assert tcn(x).shape == (4, 2)
    assert tcn.receptive_field == 1 + 2 * (3 - 1) * (1 + 2)

    counts = spike_batch(3, 10, 5)
    lfads = LFADS(5, enc_hidden=8, gen_hidden=8, factors=4)
    out = lfads(counts, inference=True)
    assert out["log_rates"].shape == counts.shape

    adjacency, _ = connectome_batch(3, 6, 2)
    gnn = BrainGNN(6, 2, hidden=8, top_k=3)
    assert gnn(adjacency).shape == (3, 2)


def test_overfit_one_batch() -> None:
    torch.manual_seed(0)
    model = TCN(4, 2, hidden=16, levels=3, dropout=0.0)
    x, y = classification_batch(8, 4, 32, 2, seed=1)
    optimizer = torch.optim.Adam(model.parameters(), lr=5e-2)
    model.train()
    first = None
    last = None
    for _ in range(80):
        optimizer.zero_grad(set_to_none=True)
        loss = F.cross_entropy(model(x), y)
        loss.backward()
        optimizer.step()
        last = float(loss.detach())
        if first is None:
            first = last
    assert first is not None and last is not None
    assert last < first * 0.1


def test_seeded_forward_is_deterministic() -> None:
    torch.manual_seed(3)
    a = TCN(4, 2, hidden=8, levels=2, dropout=0.0)
    torch.manual_seed(3)
    b = TCN(4, 2, hidden=8, levels=2, dropout=0.0)
    x, _ = classification_batch(2, 4, 16, 2)
    assert torch.allclose(a(x), b(x))


def test_onnx_parity(tmp_path) -> None:
    model = EEGConformer(
        4,
        32,
        2,
        d_model=8,
        n_heads=2,
        depth=1,
        dropout=0.0,
        temporal_kernel=3,
        pool_kernel=4,
        pool_stride=2,
    )
    model.eval()
    sample, _ = classification_batch(2, 4, 32, 2)
    path = export_onnx(model, sample, tmp_path / "conformer.onnx")
    assert parity_error(model, sample, path) <= 1e-4
    sidecar = write_preprocessing_sidecar(
        tmp_path / "preprocessing.json", sfreq=250, ch_names=["C3", "C4"]
    )
    assert "250" in sidecar.read_text(encoding="utf-8")


def test_smoke_cli_runs() -> None:
    result = train_smoke("eeg_conformer", steps=2)
    assert result["steps"] == 2
    assert result["loss_end"] > 0
