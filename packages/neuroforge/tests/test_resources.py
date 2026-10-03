import json

from neuroforge.resources import (
    get_field,
    load_algorithms,
    load_fields,
    parse_arxiv_atom,
    parse_openalex_works,
)
from neuroforge.resources.fetch import search_openalex

_ATOM = """<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom" xmlns:arxiv="http://arxiv.org/schemas/atom">
  <entry>
    <id>http://arxiv.org/abs/1608.06315v1</id>
    <title>LFADS - Latent Factor Analysis via Dynamical Systems</title>
    <published>2016-08-22T21:15:00Z</published>
    <link href="https://arxiv.org/abs/1608.06315v1" rel="alternate" type="text/html"/>
    <author><name>David Sussillo</name></author>
    <author><name>Chethan Pandarinath</name></author>
    <arxiv:doi>10.48550/arXiv.1608.06315</arxiv:doi>
  </entry>
</feed>
"""

_OPENALEX = {
    "results": [
        {
            "display_name": (
                "EEG Conformer: Convolutional Transformer for EEG Decoding and Visualization"
            ),
            "publication_year": 2022,
            "doi": "https://doi.org/10.1109/tnsre.2022.3230250",
            "cited_by_count": 1081,
            "authorships": [{"author": {"display_name": "Yonghao Song"}}],
            "primary_location": {
                "landing_page_url": "https://doi.org/10.1109/tnsre.2022.3230250",
                "source": {
                    "display_name": (
                        "IEEE Transactions on Neural Systems and Rehabilitation Engineering"
                    )
                },
            },
        }
    ]
}


def test_atlas_names_the_public_sources() -> None:
    fields = {field.slug: field for field in load_fields()}
    assert {"connectomics", "eeg-bci", "literature", "spikes", "signal", "decoding"} <= set(fields)
    eeg = fields["eeg-bci"]
    assert {item.slug for item in eeg.resources} >= {"moabb", "openneuro", "eegmmidb"}
    assert any("Song" in author for paper in eeg.papers for author in paper.authors)
    spikes = fields["spikes"]
    assert any(item.slug == "mc-maze" for item in spikes.resources)
    assert fields["connectomics"].papers[0].cited_by_count == 797
    assert fields["literature"].resources[0].kind == "api"
    for field in fields.values():
        assert field.retrieved_on == "2026-10-03"
        for resource in field.resources:
            assert resource.url.startswith("http")
            assert resource.summary.strip()


def test_algorithms_cover_the_three_fields() -> None:
    algorithms = load_algorithms()
    fields = {item.field for item in algorithms}
    assert fields == {"eeg-bci", "spikes", "connectomics"}
    shipped = {item.slug for item in algorithms if item.implemented}
    assert {"eeg-conformer", "tcn", "lfads", "brain-gnn", "csp"} - shipped == {"csp"}
    assert all(len(item.anchor) == 3 for item in algorithms)


def test_unknown_field_raises() -> None:
    try:
        get_field("nope")
    except KeyError:
        return
    raise AssertionError("expected KeyError")


def test_arxiv_atom_parser_reads_title_year_and_url() -> None:
    works = parse_arxiv_atom(_ATOM)
    assert len(works) == 1
    assert works[0].year == 2016
    assert works[0].url == "https://arxiv.org/abs/1608.06315v1"
    assert works[0].authors[0] == "David Sussillo"
    assert works[0].doi == "10.48550/arXiv.1608.06315"


def test_openalex_parser_and_search_use_the_response_body() -> None:
    works = parse_openalex_works(_OPENALEX)
    assert works[0].venue.startswith("IEEE Transactions")
    assert works[0].cited_by_count == 1081
    assert works[0].doi == "10.1109/tnsre.2022.3230250"

    def opener(url: str) -> bytes:
        assert "api.openalex.org/works" in url
        assert "EEG" in url
        return json.dumps(_OPENALEX).encode()

    found = search_openalex("EEG Conformer", limit=1, opener=opener)
    assert found[0].year == 2022
