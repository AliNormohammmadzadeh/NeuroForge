"""Registry API and a small research homepage. Search is lexical over shipped cards."""

from __future__ import annotations

from pathlib import Path
from typing import Annotated

from fastapi import FastAPI, HTTPException, Query
from fastapi.responses import FileResponse, HTMLResponse, Response
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from api.search import reciprocal_rank_fusion
from neuroforge.registry import (
    DatasetCard,
    ModelCard,
    get_model_card,
    load_dataset_cards,
    load_model_cards,
)
from neuroforge.resources import Algorithm, Field, Resource, get_field, load_algorithms, load_fields
from neuroforge.training.cli import _build


class DiscoverHit(BaseModel):
    type: str
    slug: str
    name: str
    summary: str


def _param_count(slug: str) -> int:
    names = {
        "eeg-conformer": "eeg_conformer",
        "tcn": "tcn",
        "lfads": "lfads",
        "brain-gnn": "brain_gnn",
    }
    model, _batch, _labels = _build(names[slug])
    return sum(parameter.numel() for parameter in model.parameters())


_FALLBACK = """<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>NeuroForge</title>
</head>
<body>
  <p>NeuroForge</p>
  <h1>The atlas is a React app.</h1>
  <p>Build <code>apps/web</code> and reload this page. The registry API is already serving.</p>
  <pre><code>pnpm --dir apps/web install
pnpm --dir apps/web build</code></pre>
  <p><a href="/docs">API docs</a></p>
</body>
</html>
"""


def _web_dist() -> Path | None:
    candidates = [Path.cwd() / "apps" / "web" / "dist"]
    source = Path(__file__).resolve()
    if len(source.parents) > 4:
        candidates.append(source.parents[4] / "apps" / "web" / "dist")
    for path in candidates:
        if (path / "index.html").is_file():
            return path
    return None


def create_app() -> FastAPI:
    app = FastAPI(title="NeuroForge", version="0.1.0")
    dist = _web_dist()
    if dist is not None and (dist / "assets").is_dir():
        app.mount("/assets", StaticFiles(directory=dist / "assets"), name="web-assets")

    @app.get("/favicon.ico", include_in_schema=False)
    def favicon() -> Response:
        return Response(status_code=204)

    @app.get("/healthz")
    def healthz() -> dict[str, str]:
        return {"status": "ok"}

    @app.get("/readyz")
    def readyz() -> dict[str, str]:
        load_model_cards()
        return {"status": "ready"}

    @app.get("/api/v1/models", response_model=list[ModelCard])
    def models() -> list[ModelCard]:
        cards = []
        for card in load_model_cards():
            cards.append(card.model_copy(update={"param_count": _param_count(card.slug)}))
        return cards

    @app.get("/api/v1/models/{slug}", response_model=ModelCard)
    def model(slug: str) -> ModelCard:
        try:
            card = get_model_card(slug)
        except KeyError as exc:
            raise HTTPException(status_code=404, detail="model not found") from exc
        return card.model_copy(update={"param_count": _param_count(slug)})

    @app.get("/api/v1/datasets", response_model=list[DatasetCard])
    def datasets() -> list[DatasetCard]:
        return load_dataset_cards()

    @app.get("/api/v1/fields", response_model=list[Field])
    def fields() -> list[Field]:
        return load_fields()

    @app.get("/api/v1/fields/{slug}", response_model=Field)
    def field(slug: str) -> Field:
        try:
            return get_field(slug)
        except KeyError as exc:
            raise HTTPException(status_code=404, detail="field not found") from exc

    @app.get("/api/v1/resources", response_model=list[Resource])
    def resources() -> list[Resource]:
        found = []
        for item in load_fields():
            found.extend(item.resources)
        return found

    @app.get("/api/v1/algorithms", response_model=list[Algorithm])
    def algorithms() -> list[Algorithm]:
        return load_algorithms()

    @app.get("/api/v1/discover", response_model=list[DiscoverHit])
    def discover(
        q: str = "",
        kind: Annotated[list[str] | None, Query()] = None,
    ) -> list[DiscoverHit]:
        wanted = set(kind or []) or {"model", "dataset", "resource", "algorithm"}
        hits: list[DiscoverHit] = []
        needle = q.lower().strip()
        if "model" in wanted:
            for model_card in load_model_cards():
                text = (
                    f"{model_card.name} {model_card.summary} {' '.join(model_card.modalities)}"
                ).lower()
                if needle and needle not in text and needle not in model_card.slug:
                    continue
                hits.append(
                    DiscoverHit(
                        type="model",
                        slug=model_card.slug,
                        name=model_card.name,
                        summary=model_card.summary,
                    )
                )
        if "dataset" in wanted:
            for dataset_card in load_dataset_cards():
                text = f"{dataset_card.name} {dataset_card.summary} {dataset_card.modality}".lower()
                if needle and needle not in text and needle not in dataset_card.slug:
                    continue
                hits.append(
                    DiscoverHit(
                        type="dataset",
                        slug=dataset_card.slug,
                        name=dataset_card.name,
                        summary=dataset_card.summary,
                    )
                )
        if "resource" in wanted:
            for item in load_fields():
                for resource in item.resources:
                    text = f"{resource.name} {resource.summary} {item.name}".lower()
                    if needle and needle not in text and needle not in resource.slug:
                        continue
                    hits.append(
                        DiscoverHit(
                            type="resource",
                            slug=resource.slug,
                            name=resource.name,
                            summary=resource.summary,
                        )
                    )
        if "algorithm" in wanted:
            for algorithm in load_algorithms():
                text = f"{algorithm.name} {algorithm.summary} {algorithm.use_when}".lower()
                if needle and needle not in text and needle not in algorithm.slug:
                    continue
                hits.append(
                    DiscoverHit(
                        type="algorithm",
                        slug=algorithm.slug,
                        name=algorithm.name,
                        summary=algorithm.summary,
                    )
                )
        if needle:
            lexical = [hit.slug for hit in hits if needle in f"{hit.name} {hit.summary}".lower()]
            exact = [hit.slug for hit in hits if needle in hit.slug]
            fused = reciprocal_rank_fusion([exact, lexical])
            order = {slug: index for index, (slug, _score) in enumerate(fused)}
            hits.sort(key=lambda hit: order.get(hit.slug, 10_000))
        return hits

    @app.get("/", response_model=None)
    def home() -> FileResponse | HTMLResponse:
        built = _web_dist()
        if built is not None:
            return FileResponse(built / "index.html")
        return HTMLResponse(_FALLBACK)

    return app


app = create_app()
