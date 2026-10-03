# Contributing

NeuroForge is early. The useful contributions are ones that keep the leakage and reproducibility contracts intact.

## Setup

```bash
uv sync --all-packages --group dev
uv run pytest
uv run ruff check .
uv run ruff format --check .
uv run mypy packages/neuroforge/src services/api/src
```

Tests are offline. Do not add a test that downloads BCI, DANDI, or OpenNeuro data.

## Contracts

- A `RecordingKey` group used in training must not appear in validation or test. `assert_disjoint` is the check.
- Continuous data is stored in volts. Readers convert on the way in.
- Fit normalization on the training fold only. The preprocess config hash is part of the cache key.
- Model cards may list a benchmark only when the number comes from a run this repository can reproduce. Leave `benchmarks` empty otherwise.
- Paper cards store title, authors, year, venue, and a URL. Do not paste an abstract or a PDF. Citation counts need a `retrieved_on` date.
- `packages/neuroforge` does not import `services/` or `apps/`.

## Remote data

DANDI and OpenNeuro helpers live behind the `remote` extra and are not part of the default test run:

```bash
uv sync --all-packages --extra remote
```
