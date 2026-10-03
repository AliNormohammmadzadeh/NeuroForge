"""Server-rendered atlas. The page is readable with scripts disabled."""

from __future__ import annotations

import html

from neuroforge.registry import ModelCard
from neuroforge.resources.catalog import Field

_MONTHS = (
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
)


def _when(iso_date: str) -> str:
    year, month, day = iso_date.split("-")
    return f"{int(day)} {_MONTHS[int(month) - 1]} {year}"


def _authors(names: list[str]) -> str:
    shown = names[:3]
    text = ", ".join(html.escape(name) for name in shown)
    if len(names) > 3:
        text += " et al."
    return text


def render_tabs(fields: list[Field]) -> str:
    buttons = ['<button type="button" data-field="all" aria-pressed="true">All fields</button>']
    for field in fields:
        if field.slug == "literature":
            continue
        buttons.append(
            '<button type="button" data-field="'
            f'{html.escape(field.slug)}">'
            f"{html.escape(field.name)}</button>"
        )
    return "\n".join(buttons)


def render_atlas(fields: list[Field]) -> str:
    sections: list[str] = []
    for field in fields:
        resources = []
        for resource in field.resources:
            blob = " ".join([resource.name, resource.summary, resource.access, resource.kind])
            resources.append(
                '<article class="resource" data-text="'
                f'{html.escape(blob.lower())}">'
                f'<p class="kicker">{html.escape(resource.kind)}</p>'
                f'<h3><a href="{html.escape(resource.url)}" rel="noopener noreferrer">'
                f"{html.escape(resource.name)}</a></h3>"
                f"<p>{html.escape(resource.summary)}</p>"
                f'<p class="access">{html.escape(resource.access)}</p>'
                "</article>"
            )
        papers = []
        for paper in field.papers:
            blob = " ".join([paper.title, paper.venue, " ".join(paper.authors), paper.why])
            count = ""
            if paper.cited_by_count is not None:
                count = (
                    f'<p class="count">{paper.cited_by_count:,} citations in OpenAlex '
                    f"on {_when(field.retrieved_on)}. A snapshot, not a ranking.</p>"
                )
            papers.append(
                '<li class="paper" data-text="'
                f'{html.escape(blob.lower())}">'
                f'<p class="kicker">{paper.year} · {html.escape(paper.venue)}</p>'
                f'<h3><a href="{html.escape(paper.url)}" rel="noopener noreferrer">'
                f"{html.escape(paper.title)}</a></h3>"
                f'<p class="by">{_authors(paper.authors)}</p>'
                f"<p>{html.escape(paper.why)}</p>"
                f"{count}"
                "</li>"
            )
        paper_block = ""
        if papers:
            paper_block = (
                '<h3 class="papers-label">Papers this field is named after</h3><ol class="papers">'
                + "\n".join(papers)
                + "</ol>"
            )
        sections.append(
            f'<section class="field" id="{html.escape(field.slug)}" '
            f'style="--hue: {html.escape(field.hue)}">'
            f'<p class="kicker">{html.escape(field.kicker)}</p>'
            f"<h2>{html.escape(field.name)}</h2>"
            f'<p class="essay">{html.escape(field.summary)}</p>'
            f'<div class="resources">{"".join(resources)}</div>'
            f"{paper_block}"
            "</section>"
        )
    return "\n".join(sections)


def render_models(cards: list[ModelCard]) -> str:
    rows = []
    for card in cards:
        modalities = " · ".join(html.escape(item) for item in card.modalities)
        blob = f"{card.name} {card.summary} {' '.join(card.modalities)}"
        rows.append(
            '<article class="card" data-text="'
            f'{html.escape(blob.lower())}">'
            f'<p class="kicker">{modalities}</p>'
            f"<h3>{html.escape(card.name)}</h3>"
            f"<p>{html.escape(card.summary)}</p>"
            f"<code>{html.escape(card.train_command)}</code>"
            "</article>"
        )
    return "\n".join(rows)
