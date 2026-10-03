"""ONNX export plus a numeric parity check against onnxruntime."""

from __future__ import annotations

import json
from pathlib import Path

import numpy as np
import torch
from torch import nn


def export_onnx(model: nn.Module, sample: torch.Tensor, path: Path | str, opset: int = 17) -> Path:
    destination = Path(path)
    destination.parent.mkdir(parents=True, exist_ok=True)
    model.eval()
    torch.onnx.export(
        model,
        (sample,),
        destination,
        opset_version=opset,
        input_names=["input"],
        output_names=["logits"],
        dynamic_axes={"input": {0: "batch"}, "logits": {0: "batch"}},
        dynamo=False,
    )
    return destination


def parity_error(model: nn.Module, sample: torch.Tensor, path: Path | str) -> float:
    import onnxruntime as ort

    model.eval()
    with torch.no_grad():
        reference = model(sample).detach().cpu().numpy()
    session = ort.InferenceSession(str(path), providers=["CPUExecutionProvider"])
    (got,) = session.run(None, {"input": sample.detach().cpu().numpy()})
    return float(np.max(np.abs(reference - got)))


def write_preprocessing_sidecar(
    path: Path | str,
    *,
    sfreq: float,
    ch_names: list[str],
    sos: list[list[float]] | None = None,
    mean: list[float] | None = None,
    std: list[float] | None = None,
) -> Path:
    destination = Path(path)
    payload = {
        "sfreq": sfreq,
        "ch_names": ch_names,
        "sos": sos or [],
        "mean": mean or [],
        "std": std or [],
        "filter": "causal-sos",
    }
    destination.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    return destination
