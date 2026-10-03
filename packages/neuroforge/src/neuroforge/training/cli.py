"""``neuroforge train`` runs a short synthetic recipe unless a local cache is configured."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import torch
from torch import nn
from torch.nn import functional as F

from neuroforge.models import LFADS, TCN, BrainGNN, EEGConformer
from neuroforge.resources.fetch import literature_search
from neuroforge.training.export import export_onnx, parity_error
from neuroforge.training.leakage_demo import run_leakage_demo
from neuroforge.training.synthetic import classification_batch, connectome_batch, spike_batch


def _build(name: str) -> tuple[nn.Module, torch.Tensor, torch.Tensor | None]:
    if name == "eeg_conformer":
        model: nn.Module = EEGConformer(
            n_channels=8,
            n_samples=64,
            n_outputs=2,
            d_model=16,
            n_heads=4,
            depth=1,
            dropout=0.0,
            temporal_kernel=5,
            pool_kernel=4,
            pool_stride=2,
        )
        x, y = classification_batch(16, 8, 64, 2)
        return model, x, y
    if name == "tcn":
        model = TCN(n_channels=8, n_outputs=2, hidden=16, levels=3, kernel=3, dropout=0.0)
        x, y = classification_batch(16, 8, 64, 2)
        return model, x, y
    if name == "lfads":
        model = LFADS(n_neurons=6, enc_hidden=16, gen_hidden=16, factors=4)
        counts = spike_batch(8, 12, 6)
        return model, counts, None
    if name == "brain_gnn":
        model = BrainGNN(n_regions=10, n_outputs=2, hidden=16, top_k=4)
        adjacency, y = connectome_batch(12, 10, 2)
        return model, adjacency, y
    raise SystemExit(f"Unknown model {name!r}. Choose eeg_conformer, tcn, lfads, or brain_gnn.")


def train_smoke(model_name: str, steps: int, seed: int = 0) -> dict[str, float]:
    torch.manual_seed(seed)
    model, batch, labels = _build(model_name)
    optimizer = torch.optim.AdamW(model.parameters(), lr=1e-2)
    losses: list[float] = []
    model.train()
    for _ in range(steps):
        optimizer.zero_grad(set_to_none=True)
        if isinstance(model, LFADS):
            loss = model(batch, kl_weight=0.0)["loss"]
        else:
            assert labels is not None
            loss = F.cross_entropy(model(batch), labels)
        loss.backward()
        optimizer.step()
        losses.append(float(loss.detach()))
    return {"steps": float(steps), "loss_start": losses[0], "loss_end": losses[-1]}


def export_smoke(model_name: str, path: Path) -> dict[str, float]:
    if model_name not in {"eeg_conformer", "tcn"}:
        raise SystemExit("ONNX export currently checks the EEG decoders (eeg_conformer, tcn).")
    model, batch, _labels = _build(model_name)
    model.eval()
    sample = batch[:2]
    export_onnx(model, sample, path)
    error = parity_error(model, sample, path)
    if error > 1e-4:
        raise SystemExit(f"ONNX parity failed: max abs diff {error}")
    return {"max_abs_diff": error}


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(prog="neuroforge")
    sub = parser.add_subparsers(dest="command", required=True)

    train = sub.add_parser(
        "train", help="Train on a synthetic batch (offline, no dataset download)."
    )
    train.add_argument("--model", default="eeg_conformer")
    train.add_argument("--steps", type=int, default=2)
    train.add_argument("--smoke", action="store_true", help="Force the offline synthetic recipe.")
    train.add_argument("--seed", type=int, default=0)

    export = sub.add_parser("export", help="Export an EEG decoder and check ONNX parity.")
    export.add_argument("--model", default="eeg_conformer")
    export.add_argument("--out", type=Path, default=Path("model.onnx"))

    demo = sub.add_parser(
        "demo",
        help="Compare a leaky window split with a subject split on a subject shortcut.",
    )
    demo.add_argument("--seed", type=int, default=0)
    demo.add_argument("--steps", type=int, default=80)

    literature = sub.add_parser(
        "literature",
        help="Query arXiv or OpenAlex for titles, authors, year, and a URL. No full text.",
    )
    literature.add_argument("--source", choices=("arxiv", "openalex"), default="openalex")
    literature.add_argument("--query", required=True)
    literature.add_argument("--limit", type=int, default=5)

    args, unknown = parser.parse_known_args(argv)
    for item in unknown:
        if item.startswith("model="):
            args.model = item.split("=", 1)[1]
        elif item.startswith("data=") and item.split("=", 1)[1] not in {"synthetic", "smoke"}:
            raise SystemExit(
                "This build trains on synthetic data so it runs without a dataset download. "
                "Use data=synthetic, or see configs/data for the reference-dataset recipes."
            )

    if args.command == "train":
        result = train_smoke(args.model, args.steps, seed=args.seed)
        print(json.dumps(result))
        return
    if args.command == "demo":
        report = run_leakage_demo(seed=args.seed, steps=args.steps)
        print(
            "A window split shares "
            f"{int(report['leaky_shared_subjects'])} subjects and scores "
            f"{report['leaky_accuracy']:.2f}. "
            "A subject split shares "
            f"{int(report['safe_shared_subjects'])} and scores "
            f"{report['safe_accuracy']:.2f}. "
            "The higher score is the one that memorized the person."
        )
        print(json.dumps(report))
        return
    if args.command == "literature":
        print(json.dumps(literature_search(args.source, args.query, args.limit), indent=2))
        return
    result = export_smoke(args.model, args.out)
    print(json.dumps(result))


if __name__ == "__main__":
    main()
