"""Load the field atlas shipped with the library."""

from __future__ import annotations

from pathlib import Path

import yaml
from pydantic import BaseModel, field_validator
from pydantic import Field as PydField


class Resource(BaseModel):
    slug: str
    name: str
    kind: str
    url: str
    access: str
    summary: str

    @field_validator("url")
    @classmethod
    def _http(cls, value: str) -> str:
        if not value.startswith(("http://", "https://")):
            raise ValueError("url must start with http:// or https://")
        return value


class Paper(BaseModel):
    title: str
    year: int
    authors: list[str]
    venue: str
    url: str
    why: str
    doi: str | None = None
    cited_by_count: int | None = None

    @field_validator("url")
    @classmethod
    def _http(cls, value: str) -> str:
        if not value.startswith(("http://", "https://")):
            raise ValueError("url must start with http:// or https://")
        return value


class Field(BaseModel):
    slug: str
    name: str
    kicker: str
    hue: str
    summary: str
    retrieved_on: str
    snapshot_source: str
    resources: list[Resource]
    papers: list[Paper] = PydField(default_factory=list)


def _field_dir() -> Path:
    return Path(__file__).resolve().parent.parent / "cards" / "fields"


def load_fields() -> list[Field]:
    fields = []
    for path in sorted(_field_dir().glob("*.yaml")):
        fields.append(Field.model_validate(yaml.safe_load(path.read_text(encoding="utf-8"))))
    return fields


def get_field(slug: str) -> Field:
    for field in load_fields():
        if field.slug == slug:
            return field
    raise KeyError(slug)
