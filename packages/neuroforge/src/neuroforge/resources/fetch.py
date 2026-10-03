"""Read paper metadata from the arXiv Atom API and the OpenAlex works API.

The functions parse response bodies. Nothing in the test suite calls the network.
`neuroforge literature` does, and prints title, year, authors, and a URL.
Full text is not downloaded.
"""

from __future__ import annotations

import json
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from collections.abc import Callable
from typing import Any

from pydantic import BaseModel

_ATOM = "{http://www.w3.org/2005/Atom}"
_OPENALEX = "https://api.openalex.org/works"
_ARXIV = "https://export.arxiv.org/api/query"


class Work(BaseModel):
    source: str
    title: str
    year: int | None
    authors: list[str]
    venue: str | None
    url: str
    doi: str | None = None
    cited_by_count: int | None = None


def _text(node: ET.Element, name: str) -> str:
    child = node.find(f"{_ATOM}{name}")
    if child is None or child.text is None:
        return ""
    return " ".join(child.text.split())


def parse_arxiv_atom(xml_text: str) -> list[Work]:
    root = ET.fromstring(xml_text)
    works: list[Work] = []
    for entry in root.findall(f"{_ATOM}entry"):
        title = _text(entry, "title")
        if not title:
            continue
        authors = []
        for author in entry.findall(f"{_ATOM}author"):
            name = author.find(f"{_ATOM}name")
            if name is not None and name.text:
                authors.append(name.text.strip())
        published = _text(entry, "published")
        year = int(published[:4]) if len(published) >= 4 and published[:4].isdigit() else None
        url = ""
        for link in entry.findall(f"{_ATOM}link"):
            if link.attrib.get("rel") == "alternate" and link.attrib.get("href"):
                url = link.attrib["href"]
                break
        if not url:
            url = _text(entry, "id")
        doi = None
        doi_node = entry.find("{http://arxiv.org/schemas/atom}doi")
        if doi_node is not None and doi_node.text:
            doi = doi_node.text.strip()
        works.append(
            Work(
                source="arxiv",
                title=title,
                year=year,
                authors=authors,
                venue="arXiv",
                url=url,
                doi=doi,
            )
        )
    return works


def parse_openalex_works(payload: dict[str, Any]) -> list[Work]:
    works: list[Work] = []
    for item in payload.get("results") or []:
        authors = []
        for authorship in item.get("authorships") or []:
            author = authorship.get("author") or {}
            name = author.get("display_name")
            if name:
                authors.append(str(name))
        location = item.get("primary_location") or {}
        source = location.get("source") or {}
        venue = source.get("display_name")
        doi = item.get("doi")
        url = str(doi or location.get("landing_page_url") or item.get("id") or "")
        year = item.get("publication_year")
        works.append(
            Work(
                source="openalex",
                title=str(item.get("display_name") or "").strip(),
                year=int(year) if isinstance(year, int) else None,
                authors=authors,
                venue=str(venue) if venue else None,
                url=url,
                doi=str(doi).removeprefix("https://doi.org/") if doi else None,
                cited_by_count=item.get("cited_by_count"),
            )
        )
    return [work for work in works if work.title and work.url]


Opener = Callable[[str], bytes]


def _urlopen(url: str) -> bytes:
    request = urllib.request.Request(url, headers={"User-Agent": "NeuroForge/0.1"})
    with urllib.request.urlopen(request, timeout=30) as response:
        return response.read()


def search_arxiv(query: str, limit: int = 5, opener: Opener | None = None) -> list[Work]:
    params = urllib.parse.urlencode({"search_query": query, "start": 0, "max_results": limit})
    raw = (opener or _urlopen)(f"{_ARXIV}?{params}")
    return parse_arxiv_atom(raw.decode("utf-8"))[:limit]


def search_openalex(query: str, limit: int = 5, opener: Opener | None = None) -> list[Work]:
    params = urllib.parse.urlencode(
        {
            "search": query,
            "per-page": limit,
            "select": ",".join(
                [
                    "id",
                    "display_name",
                    "publication_year",
                    "doi",
                    "authorships",
                    "primary_location",
                    "cited_by_count",
                ]
            ),
        }
    )
    raw = (opener or _urlopen)(f"{_OPENALEX}?{params}")
    return parse_openalex_works(json.loads(raw.decode("utf-8")))[:limit]


def literature_search(source: str, query: str, limit: int = 5) -> list[dict[str, object]]:
    if source == "arxiv":
        works = search_arxiv(query, limit)
    elif source == "openalex":
        works = search_openalex(query, limit)
    else:
        raise SystemExit("source must be arxiv or openalex")
    return [work.model_dump() for work in works]
