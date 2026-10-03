"""Model cards shipped with the library. Benchmark numbers are smoke-recipe metadata."""

from __future__ import annotations

from pathlib import Path

import yaml
from pydantic import BaseModel, Field


class Benchmark(BaseModel):
    dataset: str
    metric: str
    value: float
    std: float | None = None
    n_folds: int
    split_level: str


class ModelCard(BaseModel):
    slug: str
    name: str
    architecture: str
    task: str
    modalities: list[str]
    param_count: int = Field(ge=0)
    summary: str
    train_command: str
    license: str = "Apache-2.0"
    benchmarks: list[Benchmark] = Field(default_factory=list)


class DatasetCard(BaseModel):
    slug: str
    name: str
    source: str
    modality: str
    species: str
    format: str
    summary: str


def _card_dir() -> Path:
    return Path(__file__).resolve().parent / "cards"


def load_model_cards() -> list[ModelCard]:
    cards = []
    for path in sorted(_card_dir().glob("models/*.yaml")):
        cards.append(ModelCard.model_validate(yaml.safe_load(path.read_text(encoding="utf-8"))))
    return cards


def load_dataset_cards() -> list[DatasetCard]:
    cards = []
    for path in sorted(_card_dir().glob("datasets/*.yaml")):
        cards.append(DatasetCard.model_validate(yaml.safe_load(path.read_text(encoding="utf-8"))))
    return cards


def get_model_card(slug: str) -> ModelCard:
    for card in load_model_cards():
        if card.slug == slug:
            return card
    raise KeyError(slug)
