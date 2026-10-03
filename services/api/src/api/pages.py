"""Server-rendered atlas. The page is readable with scripts disabled."""

from __future__ import annotations

import html
import json

from neuroforge.registry import ModelCard
from neuroforge.resources.catalog import Algorithm, Field

_CORTEX = {"eeg-bci", "spikes", "connectomics"}
_DATA = {"archive", "benchmark"}

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
        if field.slug not in _CORTEX:
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
        blob = f"{card.name} {card.summary} {card.usage} {' '.join(card.modalities)}"
        rows.append(
            '<article class="card" data-text="'
            f'{html.escape(blob.lower())}">'
            f'<p class="kicker">{modalities}</p>'
            f"<h3>{html.escape(card.name)}</h3>"
            f"<p>{html.escape(card.summary)}</p>"
            f"<p><strong>Input.</strong> {html.escape(card.inputs)}</p>"
            f"<p><strong>Use it when.</strong> {html.escape(card.usage)}</p>"
            f"<code>{html.escape(card.train_command)}</code>"
            "</article>"
        )
    return "\n".join(rows)


def render_algo_json(algorithms: list[Algorithm]) -> str:
    payload = [item.model_dump() for item in algorithms]
    return json.dumps(payload).replace("<", "\\u003c")


def render_algorithms(algorithms: list[Algorithm]) -> str:
    cards = []
    for item in algorithms:
        state = "In this repository" if item.implemented else "Reference, not trained here"
        blob = " ".join([item.name, item.summary, item.use_when, item.field])
        command = f"<code>{html.escape(item.command)}</code>" if item.command else ""
        cards.append(
            '<article class="resource algo" data-algo="'
            f'{html.escape(item.slug)}" data-text="{html.escape(blob.lower())}">'
            f'<p class="kicker">{html.escape(state)}</p>'
            f'<h3><a href="{html.escape(item.url)}" rel="noopener noreferrer">'
            f"{html.escape(item.name)}</a></h3>"
            f"<p>{html.escape(item.summary)}</p>"
            f"<p>{html.escape(item.use_when)}</p>"
            f"{command}"
            "</article>"
        )
    return "\n".join(cards)


def render_datasets(fields: list[Field]) -> str:
    rows = []
    for field in fields:
        for resource in field.resources:
            if resource.kind not in _DATA:
                continue
            blob = " ".join([resource.name, resource.summary, field.name, resource.kind])
            rows.append(
                '<a class="dataset" data-text="'
                f'{html.escape(blob.lower())}" href="{html.escape(resource.url)}" '
                'rel="noopener noreferrer">'
                f'<p class="kicker">{html.escape(field.name)} · {html.escape(resource.kind)}</p>'
                f"<h3>{html.escape(resource.name)}</h3>"
                f"<p>{html.escape(resource.summary)}</p>"
                f'<p class="access">{html.escape(resource.access)}</p>'
                "</a>"
            )
    return "\n".join(rows)


def render_roadmap() -> str:
    steps = [
        (
            "Pick one signal",
            "EEG motor imagery, sorted spikes, or a connectivity matrix. "
            "Do not mix them in a first model.",
        ),
        (
            "Open one dataset and one paper",
            "The dataset links and the paper that named the recipe are below. "
            "Read those before a leaderboard.",
        ),
        (
            "Run the loop with no download",
            "uv run neuroforge train --model eeg_conformer --steps 2",
        ),
        (
            "Learn the split",
            "uv run neuroforge demo. A window split memorizes the person and scores "
            "higher. A subject split shares nobody and the score falls.",
        ),
        (
            "Freeze the preprocessing",
            "Filter, rereference, and fit the z-score on training data only. "
            "The config hash is the cache key.",
        ),
        (
            "Train the model for that field",
            "EEG-Conformer or the causal TCN, LFADS for spikes, BrainGNN for a connectome.",
        ),
        (
            "Score the right metric",
            "Kappa for EEG. Bits per spike for held-out spike bins. "
            "Leave benchmark cards empty until a run here reproduces the number.",
        ),
        (
            "Export only the EEG decoders",
            "uv run neuroforge export --model eeg_conformer --out model.onnx",
        ),
    ]
    items = []
    for title, body in steps:
        blob = f"{title} {body}"
        items.append(
            '<li data-text="'
            f'{html.escape(blob.lower())}">'
            f"<h3>{html.escape(title)}</h3><p>{html.escape(body)}</p></li>"
        )
    return "\n".join(items)


def render_train() -> str:
    needs = [
        (
            "Environment",
            "Python 3.11 or newer and uv. uv sync --all-packages --group dev "
            "installs the library, the tests, and the API.",
        ),
        (
            "Identity",
            "Every recording needs a dataset id and a subject id, plus session and run "
            "when those exist. That is the RecordingKey.",
        ),
        (
            "Windows after the split",
            "Cut trials only after the groups are assigned. "
            "uv run neuroforge demo shows a window split memorizing the person.",
        ),
        (
            "One input shape",
            "EEG models take (trials, channels, samples). LFADS takes (trials, time, neurons). "
            "BrainGNN takes (subjects, regions, regions).",
        ),
        (
            "A local file, when you leave synthetic data",
            "The default trainer does not download BCI IV 2a, DANDI, or ABIDE. "
            "The remote extra streams NWB and OpenNeuro when you ask it to.",
        ),
    ]
    cards = []
    for title, body in needs:
        cards.append(
            '<article class="resource" data-text="'
            f'{html.escape((title + " " + body).lower())}">'
            f"<h3>{html.escape(title)}</h3><p>{html.escape(body)}</p></article>"
        )
    return "\n".join(cards)
