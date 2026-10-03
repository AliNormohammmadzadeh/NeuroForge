# NeuroForge

A window split can memorize the person. NeuroForge cuts recordings by subject, session, or run, and the cut refuses to share that group.

```bash
uv sync --all-packages --group dev
uv run neuroforge demo
```

The demo builds eight synthetic people. Each person has one class, and every window carries that person's signature. The same linear decoder is trained twice:

| Split | Subjects shared by train and test | Accuracy |
| --- | ---: | ---: |
| Half the windows of every person | 8 | 1.00 |
| Two people held out | 0 | 0.50 |

The 1.00 is the bug. The 0.50 is the number you can publish. Seed 0 of `neuroforge demo` prints both.

**Status:** v0.1 trains on synthetic data, so this command does not download BCI Competition IV 2a, DANDI, or ABIDE. Benchmark cards ship with empty result lists. A published number is attached only after a run here reproduces it.

What else runs today:

- Group splits that refuse a subject, session, or run shared by train and test
- Causal filters, a normalizer fit on the training fold only, and a content-hashed Zarr or HDF5 cache
- BIDS and local NWB readers that return volts
- EEG-Conformer, a causal TCN, LFADS, and BrainGNN
- ONNX export of the EEG decoders with a numeric parity check
- A registry API and a field atlas: MOABB, OpenNeuro, DANDI, ABIDE, the Human Connectome Project, the papers those recipes follow, and a cortex view of the algorithms
- `neuroforge literature` queries the arXiv and OpenAlex APIs for title, authors, year, and a URL

```bash
uv run pytest
uv run neuroforge train --model eeg_conformer --steps 2
uv run uvicorn api.main:app --port 8000
pnpm --dir apps/web install
pnpm --dir apps/web dev
```

Open `http://127.0.0.1:5173`. The atlas is a React app, and the page is one React Three Fiber scene. The cortex is the pial surface of OpenNeuro ds006128 subject 01, released CC0, with the cerebellum and brainstem from the same surfaces. Scalp and skull are still smooth shells. Interfaces lets you select each part: the shells fade, and the card lists smaller steps, a short video when one exists, and the papers and pages for that part. Atlas is the algorithm map. Library holds the roadmap as five parts, each with smaller steps, sources, and buttons that open the matching part, plus the later list, datasets, models, and papers. The page reads `/api/v1/fields`, `/api/v1/algorithms`, and `/api/v1/models`. `pnpm --dir apps/web build` writes `apps/web/dist`, and the API serves that build at `http://127.0.0.1:8000`. The broader Next.js explorer in the design notes below is still a design note.

What we add later, and have not built:

- Train the subject split on a local BIDS recording, still without downloading it
- One reproduced benchmark on a model card
- The YAML configs and Lightning modules on the `neuroforge train` path
- The exported ONNX decoder, run in the browser on a synthetic trial
- A skull from the same MRI. The cortex is already the pial surface of OpenNeuro ds006128 subject 01
- A connectome you can threshold, and one channel drawn over time
- A page per model and per dataset
- Literature search on the site, then search by meaning, still without storing full papers

The finished hub is meant to answer four questions for a neuroscience researcher:

1. **"What data can I train on, and how do I load it without fighting formats?"** → Unified BIDS / NWB loaders with streaming from DANDI and OpenNeuro.
2. **"What model should I use, and how do I train it correctly?"** → A typed model zoo (EEG-Conformer, LFADS, BrainGNN) with reproducible, leakage-safe training recipes.
3. **"What's new in my field?"** → An automated feed of arXiv, bioRxiv, PubMed papers and USPTO patents, deduplicated and tagged by modality, species, and task.
4. **"What's state of the art right now?"** → A searchable benchmark and model registry with hybrid (keyword + semantic) search.

---

Sections 1–16 are the design for the rest of the hub. They describe pieces that are not all running yet.

## Table of Contents

- [1. Build Priorities (Read This First)](#1-build-priorities-read-this-first)
- [2. System Architecture](#2-system-architecture)
- [3. Tech Stack](#3-tech-stack)
- [4. Repository Layout](#4-repository-layout)
- [5. Phase 0: Foundations](#5-phase-0-foundations)
- [6. Phase 1 (Critical): Data Abstractions & Ingestion](#6-phase-1-critical-data-abstractions--ingestion)
- [7. Phase 2 (Critical): Model Zoo & Training Recipes](#7-phase-2-critical-model-zoo--training-recipes)
- [8. Phase 3 (High): Literature & Patent Ingestion Engine](#8-phase-3-high-literature--patent-ingestion-engine)
- [9. Phase 4 (Medium): Hybrid Search & Discovery API](#9-phase-4-medium-hybrid-search--discovery-api)
- [10. Phase 5 (Polish): Research Dashboard](#10-phase-5-polish-research-dashboard)
- [11. Testing, CI & Quality Gates](#11-testing-ci--quality-gates)
- [12. Local Development](#12-local-development)
- [13. Roadmap & Milestones](#13-roadmap--milestones)
- [14. Build Prompts (Phase-by-Phase)](#14-build-prompts-phase-by-phase)
- [15. Contributing](#15-contributing)
- [16. License](#16-license)

---

## 1. Build Priorities (Read This First)

The value of NeuroForge sits in the **data layer** and the **training layer**. A search UI over papers is easy to copy; correct, leakage-safe neural data pipelines and reproducible model recipes are not. Build in this order and do not start a phase until the previous phase passes its exit criteria.

| Priority | Phase | What it delivers | Why it comes here |
|---|---|---|---|
| P0 | 0. Foundations | Monorepo, tooling, CI, Docker | Everything else depends on it |
| **P1 (Critical)** | **1. Data** | BIDS/NWB wrappers, Zarr/HDF5 I/O, S3 streaming, PyTorch datasets | Models are useless without correct data |
| **P1 (Critical)** | **2. Models** | EEG-Conformer, LFADS, BrainGNN, training harness, ONNX export | The core research value |
| P2 (High) | 3. Ingestion | arXiv/bioRxiv/PubMed/patent scrapers, dedup, tagging, DB schema | Keeps the hub current |
| P3 (Medium) | 4. API | FastAPI hybrid search, discovery endpoints, Redis caching | Exposes phases 1–3 |
| P4 (Polish) | 5. Web | Next.js explorer, 3D connectome, time-series viewer | Presentation layer |

### Explicitly out of scope until v1.0

Do not build these early. They add surface area without adding research value:

- User accounts, OAuth, social features (comments, likes, follows)
- LLM chat / "ask the papers" assistant
- Hosting raw datasets ourselves (we index and stream from DANDI / OpenNeuro instead)
- Hosted GPU training-as-a-service
- Mobile apps
- Real-time hardware drivers for specific BCI headsets (we export ONNX; device integration is downstream)

---

## 2. System Architecture

```text
                        ┌──────────────────────────────────────────┐
                        │            apps/web (Next.js)            │
                        │  Explorer · Connectome 3D · Ephys Viewer │
                        └───────────────────┬──────────────────────┘
                                            │ REST (JSON)
                        ┌───────────────────▼──────────────────────┐
                        │         services/api (FastAPI)           │
                        │  /discover /models /patents /datasets    │
                        │  Hybrid search = tsvector + pgvector RRF │
                        └──────┬──────────────────────┬────────────┘
                               │                      │
                     ┌─────────▼────────┐    ┌────────▼────────┐
                     │ PostgreSQL 16    │    │ Redis 7         │
                     │ + pgvector       │    │ cache / queues  │
                     └─────────▲────────┘    └────────▲────────┘
                               │                      │
                        ┌──────┴──────────────────────┴────────────┐
                        │      services/ingest (async workers)     │
                        │ arXiv · bioRxiv · PubMed · PatentsView   │
                        │ dedup · tagging · embeddings             │
                        └──────────────────────────────────────────┘

   ┌──────────────────────────────────────────────────────────────────────┐
   │              packages/neuroforge (Python library, pip-installable)   │
   │  data/      BIDS · NWB · Zarr · HDF5 · S3 streaming · preprocessing  │
   │  models/    EEGConformer · TCN · LFADS · BrainGNN                    │
   │  training/  Lightning modules · Hydra configs · GroupKFold · ONNX    │
   └──────────────────────────────────────────────────────────────────────┘
           ▲ streams from                                 │ publishes
           │                                              ▼
   DANDI Archive (s3://dandiarchive)          benchmark results + model cards
   OpenNeuro     (s3://openneuro.org)         → PostgreSQL via API
```

**Key design rule:** `packages/neuroforge` is a standalone library. It must be usable by a researcher with `pip install neuroforge` and **zero** dependency on the API, DB, or web app. The services consume it, not the other way around.

---

## 3. Tech Stack

| Layer | Choice | Notes |
|---|---|---|
| Language | Python 3.11+, TypeScript 5 | Strict typing in both |
| Neuro I/O | `mne`, `mne-bids`, `pybids`, `pynwb`, `hdmf`, `dandi` | Community-standard formats |
| Array storage | `zarr` (v3), `h5py`, `numcodecs` (Blosc/Zstd) | Chunked, out-of-core |
| Remote I/O | `fsspec`, `s3fs`, `remfile` | Anonymous S3 streaming |
| Signal processing | `scipy.signal`, `numpy` | SOS filters for numerical stability |
| Deep learning | `torch` 2.x, `lightning` 2.x, `torch_geometric` | |
| Config | `hydra-core`, `omegaconf`, `pydantic` v2 | |
| Metrics | `torchmetrics`, `scikit-learn` | Pearson r, ROC-AUC, co-bps |
| Export | `onnx`, `onnxruntime` | Real-time closed-loop inference |
| Experiment tracking | MLflow (self-hostable) | Optional W&B adapter |
| Async scraping | `httpx`, `asyncio`, `tenacity`, `feedparser`, `lxml` | |
| Dedup | `rapidfuzz` | Fuzzy title matching |
| Embeddings | `sentence-transformers` with `allenai/specter2_base` (768-d) | Scientific-text embeddings |
| Scheduler | `APScheduler` (v1) → Celery/Arq when scaling | |
| Database | PostgreSQL 16 + `pgvector`, SQLAlchemy 2.0, Alembic | |
| API | FastAPI, Pydantic v2, `redis-py` (async) | |
| Frontend | Next.js 15 (App Router), Tailwind CSS, `three` / `@react-three/fiber`, WebGL2 | |
| Tooling | `uv`, `ruff`, `mypy --strict`, `pytest`, `pnpm`, `eslint`, `vitest`, `playwright` | |
| Infra | Docker Compose (dev), GitHub Actions (CI) | |

---

## 4. Repository Layout

```text
neuro-forge/
├── README.md
├── LICENSE
├── pyproject.toml                    # uv workspace root
├── docker-compose.yml
├── .github/workflows/
│   ├── python.yml                    # lint, type-check, test library + services
│   └── web.yml                       # lint, test, build frontend
│
├── packages/
│   └── neuroforge/                   # THE CORE LIBRARY (Phases 1 & 2)
│       ├── pyproject.toml
│       ├── src/neuroforge/
│       │   ├── __init__.py
│       │   ├── data/
│       │   │   ├── types.py          # ContinuousRecording, SpikeRecording, Connectome
│       │   │   ├── bids.py           # BIDSReader (mne-bids / pybids)
│       │   │   ├── nwb.py            # NWBReader (pynwb / hdmf)
│       │   │   ├── remote.py         # DANDI + OpenNeuro S3 streaming
│       │   │   ├── store.py          # Zarr / HDF5 chunked cache
│       │   │   ├── preprocessing.py  # bandpass, notch, CAR, binning
│       │   │   ├── windowing.py      # window/stride index computation
│       │   │   ├── splits.py         # subject/session-isolated splits
│       │   │   └── datasets.py       # torch Dataset / IterableDataset
│       │   ├── models/
│       │   │   ├── eeg_conformer.py
│       │   │   ├── tcn.py
│       │   │   ├── lfads.py
│       │   │   └── brain_gnn.py
│       │   ├── training/
│       │   │   ├── lit_modules.py    # LightningModules per task
│       │   │   ├── metrics.py        # pearson_r, co_bps, roc_auc
│       │   │   ├── cv.py             # GroupKFold runner
│       │   │   ├── export.py         # ONNX export + parity check
│       │   │   └── cli.py            # `neuroforge train ...`
│       │   └── registry.py           # model card + benchmark result schema
│       ├── configs/                  # Hydra configs
│       │   ├── train.yaml
│       │   ├── data/{bci_iv_2a,nlb_mc_maze,abide_connectome}.yaml
│       │   ├── model/{eeg_conformer,tcn,lfads,brain_gnn}.yaml
│       │   ├── optimizer/{adamw,adam}.yaml
│       │   └── scheduler/{cosine,onecycle,plateau}.yaml
│       └── tests/
│
├── services/
│   ├── ingest/                       # Phase 3
│   │   ├── src/ingest/
│   │   │   ├── clients/{arxiv,biorxiv,pubmed,patentsview}.py
│   │   │   ├── dedup.py
│   │   │   ├── tagging.py
│   │   │   ├── embeddings.py
│   │   │   ├── scheduler.py
│   │   │   └── db/{models.py,session.py}
│   │   ├── alembic/
│   │   └── tests/
│   └── api/                          # Phase 4
│       ├── src/api/
│       │   ├── main.py
│       │   ├── routers/{discover,models,patents,datasets}.py
│       │   ├── search/hybrid.py
│       │   ├── schemas/              # Pydantic v2
│       │   └── cache.py
│       └── tests/
│
├── apps/
│   └── web/                          # Phase 5
│       ├── app/
│       │   ├── (explore)/page.tsx
│       │   ├── models/[id]/page.tsx
│       │   ├── patents/page.tsx
│       │   └── datasets/page.tsx
│       ├── components/
│       │   ├── FacetSidebar.tsx
│       │   ├── RecipeCard.tsx
│       │   ├── PatentTable.tsx
│       │   ├── ConnectomeViewer.tsx
│       │   └── EphysViewer.tsx
│       └── lib/api.ts
│
└── docs/
    ├── data-contracts.md
    ├── adding-a-dataset.md
    ├── adding-a-model.md
    └── adding-a-source.md
```

---

## 5. Phase 0: Foundations

**Goal:** a repo where every later phase can be developed, tested, and run with one command.

Tasks:

1. `uv` workspace with `packages/neuroforge`, `services/ingest`, `services/api` as members.
2. `ruff` (lint + format), `mypy --strict` on `packages/neuroforge`, `pytest` with `pytest-cov`.
3. `docker-compose.yml` with `postgres` (image `pgvector/pgvector:pg16`), `redis:7`, `mlflow`.
4. GitHub Actions running lint, type-check, and tests on every PR.
5. `pre-commit` hooks.

**Exit criteria:** `docker compose up -d && uv run pytest` passes on a clean clone.

---

## 6. Phase 1 (Critical): Data Abstractions & Ingestion

This is the most important phase. Every model, benchmark, and dataset page depends on these contracts being correct.

### 6.1 Canonical data types (`data/types.py`)

Every reader, regardless of source format, must return one of three typed containers. Models only ever see these.

```python
from __future__ import annotations
from dataclasses import dataclass, field
from typing import Literal
import numpy as np
import numpy.typing as npt

CoordSpace = Literal["MNI152NLin2009cAsym", "fsaverage", "Talairach", "native", "unknown"]


@dataclass(frozen=True, slots=True)
class RecordingKey:
    """Identity used for leakage-safe splitting. Never split below this level."""

    dataset_id: str
    subject_id: str
    session_id: str | None = None
    run_id: str | None = None


@dataclass(slots=True)
class ContinuousRecording:
    """EEG / MEG / iEEG / LFP. data is (n_channels, n_samples), lazily backed."""

    key: RecordingKey
    data: npt.ArrayLike  # np.ndarray | zarr.Array | h5py.Dataset
    sfreq: float
    ch_names: list[str]
    ch_types: list[str]  # "eeg", "meg", "seeg", "ecog", "lfp", ...
    montage: dict[str, tuple[float, float, float]] | None = None
    coord_space: CoordSpace = "unknown"
    units: str = "V"
    events: npt.NDArray[np.float64] | None = None  # (n_events, 3): onset_s, duration_s, code
    event_labels: dict[int, str] = field(default_factory=dict)
    bad_channels: list[str] = field(default_factory=list)


@dataclass(slots=True)
class SpikeRecording:
    """Neuropixels / Utah array sorted units."""

    key: RecordingKey
    spike_times: list[npt.NDArray[np.float64]]  # per-unit, seconds
    unit_ids: npt.NDArray[np.int64]
    cluster_quality: list[str] | None = None  # "good", "mua", "noise"
    waveforms: npt.NDArray[np.float32] | None = None  # (n_units, n_samples, n_channels)
    brain_area: list[str] | None = None
    trials: npt.NDArray[np.float64] | None = None  # (n_trials, 2): start_s, stop_s
    behavior: dict[str, npt.NDArray[np.float64]] = field(default_factory=dict)


@dataclass(slots=True)
class Connectome:
    """Structural / functional connectivity on a parcellation."""

    key: RecordingKey
    adjacency: npt.NDArray[np.float32]  # (n_regions, n_regions)
    region_labels: list[str]
    parcellation: str  # "Schaefer400", "AAL3", "HCP-MMP1", ...
    coords: npt.NDArray[np.float32] | None = None  # (n_regions, 3)
    coord_space: CoordSpace = "unknown"
    kind: Literal["structural", "functional", "effective"] = "functional"
    node_features: npt.NDArray[np.float32] | None = None
```

### 6.2 Format readers

| Reader | Library | Input | Output |
|---|---|---|---|
| `BIDSReader` | `mne-bids`, `pybids` | BIDS root (local or S3) | `ContinuousRecording` |
| `NWBReader` | `pynwb`, `hdmf` | `.nwb` file (local or S3 via `remfile`) | `ContinuousRecording` (from `ElectricalSeries`) or `SpikeRecording` (from `Units` table) |
| `ConnectomeReader` | `numpy`, `nibabel` | `.npy` / `.csv` / `.mat` + parcellation atlas | `Connectome` |

Rules:

- Readers are **lazy**: they return array handles, never load full recordings into RAM.
- Readers validate: `len(ch_names) == data.shape[0]`, `sfreq > 0`, spike times monotonic, adjacency square.
- Unit conversion to SI happens in the reader (µV → V), never in the model.

### 6.3 Remote streaming (`data/remote.py`)

Both archives allow **anonymous** S3 reads, so no credentials are needed:

| Archive | Bucket | Access pattern |
|---|---|---|
| DANDI | `s3://dandiarchive` | Resolve asset URL via `dandi.dandiapi.DandiAPIClient`, then stream the NWB file with `remfile` + `h5py` |
| OpenNeuro | `s3://openneuro.org` | `s3fs.S3FileSystem(anon=True)`, browse `dsXXXXXX/sub-*/...` |

```python
import h5py, remfile
from dandi.dandiapi import DandiAPIClient
from pynwb import NWBHDF5IO


def open_dandi_nwb(dandiset_id: str, asset_path: str, version: str = "draft") -> NWBHDF5IO:
    with DandiAPIClient() as client:
        asset = client.get_dandiset(dandiset_id, version).get_asset_by_path(asset_path)
        url = asset.get_content_url(follow_redirects=1, strip_query=True)
    rfile = remfile.File(url)  # HTTP range requests, no full download
    h5 = h5py.File(rfile, "r")
    return NWBHDF5IO(file=h5, mode="r", load_namespaces=True)
```

### 6.4 Local chunked cache (`data/store.py`)

Remote reads are slow for random access during training. After the first pass, preprocessed data is materialized to a local Zarr store:

- Layout: `cache/{dataset_id}/{subject}/{session}/{run}.zarr`
- Chunks: `(n_channels, ~2 s of samples)` for continuous data; time-major so window reads hit 1–2 chunks.
- Compression: Blosc + Zstd level 5, bit-shuffle.
- A `manifest.json` per store records the preprocessing config hash. **If the hash changes, the cache is invalid.**

### 6.5 Preprocessing (`data/preprocessing.py`)

Use second-order sections (SOS) for numerical stability. Offline training uses zero-phase `sosfiltfilt`; real-time inference must use causal `sosfilt` with carried state (the ONNX path documents this difference).

```python
import numpy as np
from scipy import signal


def bandpass(
    x: np.ndarray, sfreq: float, l_freq: float, h_freq: float, order: int = 4, causal: bool = False
) -> np.ndarray:
    nyq = sfreq / 2.0
    if not 0 < l_freq < h_freq < nyq:
        raise ValueError(f"Invalid band {l_freq}-{h_freq} Hz for sfreq={sfreq}")
    sos = signal.butter(order, [l_freq, h_freq], btype="bandpass", fs=sfreq, output="sos")
    return signal.sosfilt(sos, x, axis=-1) if causal else signal.sosfiltfilt(sos, x, axis=-1)


def notch(
    x: np.ndarray, sfreq: float, freq: float = 50.0, q: float = 30.0, harmonics: int = 2
) -> np.ndarray:
    out = x
    for k in range(1, harmonics + 1):
        f0 = freq * k
        if f0 >= sfreq / 2:
            break
        b, a = signal.iirnotch(f0, q, fs=sfreq)
        out = signal.filtfilt(b, a, out, axis=-1)
    return out


def common_average_reference(x: np.ndarray, bad_mask: np.ndarray | None = None) -> np.ndarray:
    """x: (n_channels, n_samples). Bad channels are excluded from the reference."""
    good = ~bad_mask if bad_mask is not None else np.ones(x.shape[0], dtype=bool)
    return x - x[good].mean(axis=0, keepdims=True)


def bin_spikes(
    spike_times: list[np.ndarray], t_start: float, t_stop: float, bin_size: float
) -> np.ndarray:
    """Returns (n_units, n_bins) int32 spike counts."""
    edges = np.arange(t_start, t_stop + bin_size / 2, bin_size)
    return np.stack([np.histogram(st, bins=edges)[0] for st in spike_times]).astype(np.int32)
```

Notch frequency is a config value (50 Hz Europe/Asia, 60 Hz Americas) and is read from the dataset's `PowerLineFrequency` BIDS field when available.

### 6.6 Windowing (`data/windowing.py`)

```python
def window_starts(n_samples: int, win: int, stride: int, drop_last: bool = True) -> np.ndarray:
    if win <= 0 or stride <= 0:
        raise ValueError("win and stride must be positive")
    if n_samples < win:
        return np.empty(0, dtype=np.int64)
    starts = np.arange(0, n_samples - win + 1, stride, dtype=np.int64)
    if not drop_last and starts[-1] + win < n_samples:
        starts = np.append(starts, n_samples - win)
    return starts
```

Windows are configured in **seconds** (`window_s`, `stride_s`) and converted to samples per recording, so datasets with different sampling rates compose correctly. Two modes are supported: **event-locked** (epochs around `events`) and **sliding** (continuous decoding).

### 6.7 Leakage-safe splitting (`data/splits.py`)

The most common bug in published BCI results is windows from the same subject appearing in both train and test. NeuroForge makes this impossible by design:

- Splits are computed on `RecordingKey`s **before** windowing.
- `split_level` is one of `subject` (default, cross-subject generalization), `session` (within-subject, cross-session), or `run`.
- After splitting, an assertion verifies the train and test group sets are disjoint. This runs on every training job, not just in tests.

```python
from sklearn.model_selection import GroupKFold


def group_kfold(keys: list[RecordingKey], n_splits: int, level: str = "subject"):
    groups = [_group_of(k, level) for k in keys]
    for train_idx, test_idx in GroupKFold(n_splits=n_splits).split(keys, groups=groups):
        train_g = {groups[i] for i in train_idx}
        test_g = {groups[i] for i in test_idx}
        assert train_g.isdisjoint(test_g), f"Leakage: {train_g & test_g}"
        yield train_idx, test_idx


def _group_of(k: RecordingKey, level: str) -> str:
    if level == "subject":
        return f"{k.dataset_id}/{k.subject_id}"
    if level == "session":
        return f"{k.dataset_id}/{k.subject_id}/{k.session_id}"
    if level == "run":
        return f"{k.dataset_id}/{k.subject_id}/{k.session_id}/{k.run_id}"
    raise ValueError(level)
```

Normalization statistics (z-score mean/std) are fit **only on the training fold** and saved alongside the checkpoint.

### 6.8 PyTorch datasets (`data/datasets.py`)

- `WindowedDataset(torch.utils.data.Dataset)`: map-style, for cached Zarr data. Holds a flat index of `(recording_idx, start_sample)`. Opens Zarr handles lazily **per worker** (in `__getitem__`), so it is safe with `num_workers > 0`.
- `StreamingWindowDataset(torch.utils.data.IterableDataset)`: for remote data too large to cache. Shards recordings across workers with `torch.utils.data.get_worker_info()` and uses a bounded shuffle buffer.
- `SpikeTrialDataset`: binned spike counts per trial, plus behavior targets.
- `ConnectomeDataset`: returns `torch_geometric.data.Data` objects (edge index, edge weight, node features, label).

### 6.9 Reference datasets for v1

| Modality | Dataset | Source | Used by |
|---|---|---|---|
| EEG motor imagery | BCI Competition IV 2a (via MOABB) / OpenNeuro MI sets | OpenNeuro / MOABB | EEG-Conformer, TCN |
| Spikes | NLB `MC_Maze` (DANDI 000128) | DANDI | LFADS |
| Connectome | ABIDE preprocessed (functional) | Public S3 | BrainGNN |

**Phase 1 exit criteria:**

- All three readers return valid typed containers on the reference datasets.
- Streaming a single NWB file from DANDI works without a full download.
- Preprocessing has unit tests against synthetic sinusoids (e.g. a 10 Hz + 50 Hz signal; after a 50 Hz notch, 50 Hz power drops by > 30 dB).
- The leakage assertion is tested with a deliberately leaky split and fails as expected.
- Throughput benchmark: ≥ 5,000 windows/s from the local Zarr cache with 8 workers on a laptop SSD.

---

## 7. Phase 2 (Critical): Model Zoo & Training Recipes

Every model ships as: a typed `nn.Module`, a `LightningModule`, a Hydra config, a reference benchmark number, and a model card.

### 7.1 Models

#### EEG-Conformer / TCN (`models/eeg_conformer.py`, `models/tcn.py`)

For continuous time-series decoding (motor imagery, spectrogram tasks).

- **Conformer:** temporal conv (1×25) → spatial conv (C×1) → BatchNorm → ELU → avg-pool (1×75, stride 15) → 1×1 projection to `d_model` tokens → N × Transformer encoder (multi-head self-attention, pre-norm) → classification / regression head.
- **TCN:** stacked dilated causal 1D convs (dilation 1, 2, 4, …) with residual connections and weight norm. Being causal makes it directly suitable for real-time BCI.
- Input: `(batch, n_channels, n_samples)`. Output: logits `(batch, n_classes)` or continuous targets `(batch, n_targets)`.

#### LFADS-style sequential VAE (`models/lfads.py`)

Reconstructs latent firing dynamics from binned spike counts.

- **Encoder:** bidirectional GRU over spike counts → `q(g0 | x)` (initial condition, diagonal Gaussian).
- **Controller (optional):** GRU producing inferred inputs `u_t` with their own posterior.
- **Generator:** GRU unrolled from `g0`, driven by `u_t` → linear → factors `f_t` (low-dimensional) → linear → `log_rates`.
- **Observation model:** Poisson. Loss = Poisson NLL + β·KL, with KL warm-up and L2 penalty on recurrent weights.
- **Regularization:** coordinated dropout on inputs (prevents the identity shortcut).

```python
import torch
import torch.nn.functional as F


def lfads_loss(log_rates, counts, q_mu, q_logvar, kl_weight: float):
    recon = F.poisson_nll_loss(log_rates, counts, log_input=True, full=False, reduction="sum")
    kl = -0.5 * torch.sum(1 + q_logvar - q_mu.pow(2) - q_logvar.exp())
    n = counts.shape[0]
    return (recon + kl_weight * kl) / n, recon / n, kl / n
```

#### BrainGNN / edge-aware GCN (`models/brain_gnn.py`)

Operates on connectivity matrices.

- Graph construction: keep top-k% edges by |weight| per node (configurable), edge weight = correlation (or Fisher-z).
- Node features: the node's row of the connectivity matrix (standard for ABIDE/BrainGNN) or region-level features.
- Layers: edge-weighted `GCNConv` / `GATv2Conv` (with `edge_dim`) → TopK pooling (ROI-aware) → readout (mean ‖ max) → MLP.
- Output: subject-level classification (e.g. ASD vs. control) or regression.

### 7.2 Metrics (`training/metrics.py`)

| Metric | Task | Definition |
|---|---|---|
| Accuracy, Cohen's κ | MI classification | Standard |
| ROC-AUC | Binary / one-vs-rest | `torchmetrics.AUROC` |
| Pearson r | Continuous decoding (e.g. cursor velocity) | Per-target, averaged |
| **co-bps** | Spike rate inference (NLB) | Bits per spike above a per-neuron mean-rate Poisson baseline on held-out neurons |

```python
import math
import torch


def poisson_ll(rates: torch.Tensor, counts: torch.Tensor) -> torch.Tensor:
    rates = rates.clamp_min(1e-9)
    return (counts * torch.log(rates) - rates - torch.lgamma(counts + 1)).sum()


def co_bps(pred_rates: torch.Tensor, heldout_counts: torch.Tensor) -> float:
    """pred_rates, heldout_counts: (trials, time, neurons), rates in counts/bin."""
    null_rates = heldout_counts.mean(dim=(0, 1), keepdim=True).expand_as(heldout_counts)
    ll_model = poisson_ll(pred_rates, heldout_counts)
    ll_null = poisson_ll(null_rates, heldout_counts)
    n_spikes = heldout_counts.sum().clamp_min(1)
    return float((ll_model - ll_null) / (n_spikes * math.log(2)))


def pearson_r(pred: torch.Tensor, target: torch.Tensor) -> torch.Tensor:
    """(n, d) → mean r over d."""
    p = pred - pred.mean(0)
    t = target - target.mean(0)
    r = (p * t).sum(0) / (p.norm(dim=0) * t.norm(dim=0)).clamp_min(1e-12)
    return r.mean()
```

### 7.3 Hydra config schema (`configs/train.yaml`)

```yaml
defaults:
  - data: bci_iv_2a
  - model: eeg_conformer
  - optimizer: adamw
  - scheduler: cosine
  - _self_

seed: 42
task: classification           # classification | regression | latent_dynamics | graph
cv:
  n_splits: 5
  split_level: subject         # subject | session | run
trainer:
  max_epochs: 200
  precision: bf16-mixed
  gradient_clip_val: 1.0
  accumulate_grad_batches: 1
  deterministic: true
early_stopping:
  monitor: val/loss
  patience: 20
metrics: [accuracy, cohen_kappa, roc_auc]
logging:
  backend: mlflow
  tracking_uri: ${oc.env:MLFLOW_TRACKING_URI,http://localhost:5000}
export:
  onnx: true
  opset: 17
  dynamic_batch: true
```

```yaml
# configs/data/bci_iv_2a.yaml
name: bci_iv_2a
source: moabb:BNCI2014_001
preprocessing:
  bandpass: {l_freq: 4.0, h_freq: 40.0, order: 4}
  notch: {freq: 50.0, harmonics: 2}
  car: true
  resample: 250
window: {mode: event, tmin_s: 0.0, tmax_s: 4.0}
normalize: zscore_per_channel
batch_size: 64
num_workers: 8
```

Every config is validated by a Pydantic model on load, so a typo fails immediately instead of after an hour of training.

### 7.4 Cross-validation runner (`training/cv.py`)

1. Load recording keys from the data config.
2. For each fold from `group_kfold(...)`: build datasets, fit normalizer on train only, train with Lightning, evaluate on the held-out fold.
3. Report mean ± std across folds and write a `BenchmarkResult` JSON (dataset, model, config hash, git SHA, per-fold metrics, hardware, wall time).
4. Optional: `--publish` sends the result to the API (Phase 4).

CLI:

```bash
uv run neuroforge train model=eeg_conformer data=bci_iv_2a cv.n_splits=9
uv run neuroforge train model=lfads data=nlb_mc_maze task=latent_dynamics
uv run neuroforge train model=brain_gnn data=abide_connectome task=graph
```

### 7.5 ONNX export (`training/export.py`)

- Export with `torch.onnx.export(..., opset_version=17, dynamic_axes={"input": {0: "batch"}})`.
- **Parity check:** run the same random batch through PyTorch and `onnxruntime`; fail if `max|Δ| > 1e-4`.
- **Latency check:** report p50/p99 single-sample latency on CPU with `onnxruntime`. Target for EEG decoders: p99 < 10 ms.
- Export a `preprocessing.json` alongside the model containing filter SOS coefficients, channel order, sampling rate, and normalization statistics, so a real-time client can reproduce preprocessing exactly (causal filters).
- LFADS export is for the encoder + generator in inference mode (posterior mean, no sampling).

### 7.6 Model cards (`registry.py`)

Each model ships a `model_card.yaml`: architecture, parameter count, input contract (channels, sfreq, window length), training datasets, benchmark metrics per dataset, hardware (GPU, peak VRAM, training time), license, checkpoint URL, citation.

**Phase 2 exit criteria:**

- Each of the three models trains end-to-end on its reference dataset via one CLI command.
- Reproduced numbers are within a reasonable margin of published results (document the margin in the model card).
- ONNX parity and latency checks pass for the EEG decoders.
- A "smoke" config for each model trains for 2 steps on synthetic data in CI in under 60 s.

---

## 8. Phase 3 (High): Literature & Patent Ingestion Engine

An async microservice (`services/ingest`) that keeps the hub current.

### 8.1 Sources

| Source | Endpoint | Query | Rate limit / notes |
|---|---|---|---|
| arXiv | `http://export.arxiv.org/api/query` (Atom) | `cat:q-bio.NC OR cat:cs.NE OR (cat:cs.AI AND neural-keywords) OR (cat:stat.ML AND neural-keywords)` | ~1 request / 3 s, paginate with `start`/`max_results` |
| bioRxiv | `https://api.biorxiv.org/details/biorxiv/{from}/{to}/{cursor}` | Filter `category == "neuroscience"` | 100 records per page; also query `/pubs/` for preprint→published DOI links |
| PubMed | NCBI E-utilities `esearch.fcgi` + `efetch.fcgi` | MeSH: `"Brain-Computer Interfaces"[MeSH] OR "Neural Networks, Computer"[MeSH] OR "Computational Biology"[MeSH] AND neuro*` | 3 req/s without key, 10 req/s with `NCBI_API_KEY`; use `usehistory=y` |
| USPTO | PatentsView PatentSearch API | CPC filters below | Requires free API key (`X-Api-Key`) |
| Google Patents | BigQuery `patents-public-data.patents.publications` | Same CPC filters | No official REST API; use BigQuery (optional, needs GCP project) |

`cs.AI` and `stat.ML` are very broad, so results from those categories are kept only if the title or abstract matches a neuroscience keyword list (EEG, spike, cortex, BCI, fMRI, connectome, neural decoding, …).

**CPC codes:** `A61B5/04` was retired in the 2021 CPC revision; brain-signal detection now lives in **`A61B5/24`–`A61B5/398`** (e.g. `A61B5/369` EEG, `A61B5/372` EEG analysis, `A61B5/375` ECoG). NeuroForge queries the new range and keeps `A61B5/04*` for older records. Also tracked: **`G06N3/00`** (biologically-inspired computational models / neural networks), **`G16H`** (healthcare informatics), and **`A61B5/316`** (bioelectric signal modalities), plus `G06F3/015` (input from brain signals).

### 8.2 Worker design

```python
import asyncio
import httpx
from tenacity import retry, stop_after_attempt, wait_exponential_jitter, retry_if_exception_type


class RateLimiter:
    def __init__(self, rate_per_s: float) -> None:
        self._interval = 1.0 / rate_per_s
        self._lock = asyncio.Lock()
        self._last = 0.0

    async def wait(self) -> None:
        async with self._lock:
            loop = asyncio.get_running_loop()
            delay = self._last + self._interval - loop.time()
            if delay > 0:
                await asyncio.sleep(delay)
            self._last = loop.time()


class BaseClient:
    source: str

    def __init__(self, client: httpx.AsyncClient, rate_per_s: float) -> None:
        self.http = client
        self.limiter = RateLimiter(rate_per_s)

    @retry(
        stop=stop_after_attempt(5),
        wait=wait_exponential_jitter(initial=1, max=60),
        retry=retry_if_exception_type((httpx.TransportError, httpx.HTTPStatusError)),
    )
    async def get(self, url: str, **kwargs) -> httpx.Response:
        await self.limiter.wait()
        r = await self.http.get(url, **kwargs)
        if r.status_code == 429 or r.status_code >= 500:
            r.raise_for_status()
        return r
```

- Each client yields normalized `RawRecord` objects (`source`, `external_id`, `title`, `abstract`, `authors`, `doi`, `published_at`, `categories`, `url`, `raw` JSON).
- **Incremental sync:** each source stores a watermark (`last_synced_at` / cursor) in a `sync_state` table. Runs fetch only new records.
- **Idempotent upserts** on `(source, external_id)`.
- **Scheduler:** APScheduler — arXiv/bioRxiv every 6 h, PubMed daily, patents weekly. Each job has a lock in Redis to prevent overlapping runs.

### 8.3 Deduplication (`dedup.py`)

Pairs preprints with their peer-reviewed versions into a single **work** with multiple **versions**.

1. **DOI match (exact):** bioRxiv `/pubs/` gives `preprint_doi → published_doi`; arXiv entries often carry a `journal_ref` / `doi`. Exact DOI match wins.
2. **Fuzzy match (fallback):** normalize titles (lowercase, NFKD, strip punctuation and LaTeX, collapse whitespace). Candidate pairs come from a trigram index (`pg_trgm`) on normalized titles. Accept a match if all hold:
   - `rapidfuzz.fuzz.token_sort_ratio(title_a, title_b) >= 93`
   - first-author surname matches, or author-set Jaccard ≥ 0.5
   - `|year_a - year_b| <= 2`
3. Matches between 85 and 93 are queued for manual review instead of auto-merged.

### 8.4 Tagging (`tagging.py`)

Rule-based first (deterministic, explainable, testable); an ML classifier can replace it later using the rule-tagged data as weak labels.

| Facet | Values | Method |
|---|---|---|
| Modality | EEG, MEG, ECoG, sEEG, LFP, Spikes, Calcium imaging, fMRI, dMRI, fNIRS | Regex dictionaries with word boundaries |
| Species | Human, Macaque, Mouse, Rat, Zebrafish, Drosophila, C. elegans, In silico | Dictionary + MeSH terms (PubMed) |
| Task type | Decoding, Encoding, Foundation model, Spike sorting, Latent dynamics, Connectomics, Source localization | Keyword rules with weights; highest score above threshold |
| Code / data links | GitHub, GitLab, Hugging Face, Zenodo, OSF, DANDI, OpenNeuro | URL regex on abstract + full-text links |

Each tag stores `confidence` and `rule_id` so you can see why it was assigned.

### 8.5 Embeddings (`embeddings.py`)

- Model: `allenai/specter2_base` (768-d), input = `title + [SEP] + abstract`. Patents embed `title + first independent claim`.
- Batched on GPU if available, CPU fallback. Embedding version is stored so re-embedding is possible.

### 8.6 Database schema (SQLAlchemy 2.0 + Alembic)

Core tables:

```text
works              id, canonical_title, normalized_title, doi, year, abstract,
                   search_tsv (tsvector, generated), embedding vector(768),
                   embedding_model, created_at, updated_at
work_versions      id, work_id → works, source (arxiv|biorxiv|pubmed), external_id,
                   doi, version_type (preprint|published), url, published_at, raw jsonb
                   UNIQUE(source, external_id)
authors            id, name, normalized_name, orcid
work_authors       work_id, author_id, position
tags               id, facet (modality|species|task), value
work_tags          work_id, tag_id, confidence, rule_id
code_links         id, work_id, kind (github|hf|zenodo|dandi|openneuro|...), url
patents            id, publication_number, title, abstract, first_claim, filing_date,
                   publication_date, assignees text[], inventors text[],
                   cpc_codes text[], search_tsv, embedding vector(768), raw jsonb
models             id, slug, name, architecture, task, modalities text[], param_count,
                   input_contract jsonb, hardware jsonb, license, checkpoint_url,
                   card_md, embedding vector(768), work_id → works (nullable)
datasets           id, slug, name, source (dandi|openneuro|other), source_id, modality,
                   species, n_subjects, n_sessions, format (nwb|bids), s3_uri, size_bytes,
                   license, metadata jsonb
benchmark_results  id, model_id, dataset_id, metric, value, std, n_folds, split_level,
                   config_hash, git_sha, hardware jsonb, created_at
sync_state         source, cursor, last_synced_at
```

Indexes:

- `GIN (search_tsv)` on `works` and `patents`.
- `HNSW (embedding vector_cosine_ops)` on `works`, `patents`, `models`.
- `GIN (normalized_title gin_trgm_ops)` for fuzzy dedup candidates.
- `GIN (cpc_codes)`, `GIN (assignees)` on `patents`.
- B-tree on `published_at`, `publication_date`, and `(model_id, dataset_id, metric)`.

`search_tsv` is a generated column with weights: title `A`, keywords/tags `B`, abstract `C`.

**Phase 3 exit criteria:**

- A full sync of the last 90 days from each source completes with no unhandled errors.
- Re-running the sync creates zero duplicates.
- Dedup precision ≥ 0.98 on a hand-labeled set of 200 preprint/published pairs.
- Tagging precision ≥ 0.9 for modality and species on a labeled sample of 300 records.

---

## 9. Phase 4 (Medium): Hybrid Search & Discovery API

### 9.1 Hybrid search

Run full-text and vector searches in parallel and merge with **Reciprocal Rank Fusion** (RRF). RRF needs no score calibration between the two retrievers.

```sql
WITH fts AS (
  SELECT id, row_number() OVER (ORDER BY ts_rank_cd(search_tsv, q) DESC) AS rnk
  FROM works, websearch_to_tsquery('english', :query) q
  WHERE search_tsv @@ q
  LIMIT 200
),
vec AS (
  SELECT id, row_number() OVER (ORDER BY embedding <=> :query_vec) AS rnk
  FROM works
  ORDER BY embedding <=> :query_vec
  LIMIT 200
)
SELECT id, SUM(1.0 / (60 + rnk)) AS score
FROM (SELECT * FROM fts UNION ALL SELECT * FROM vec) t
GROUP BY id
ORDER BY score DESC
LIMIT :limit OFFSET :offset;
```

Facet filters (modality, species, task, has-code, year range) are applied inside both CTEs so ranking respects filters. Set `hnsw.ef_search` to at least the vector `LIMIT`.

### 9.2 Endpoints

| Method | Path | Purpose | Key params |
|---|---|---|---|
| GET | `/api/v1/discover` | Unified faceted search over works, models, datasets, patents | `q`, `type[]`, `modality[]`, `species[]`, `task[]`, `min_metric`, `metric`, `has_code`, `year_from`, `year_to`, `cursor`, `limit` |
| GET | `/api/v1/models/{id}` | Model spec sheet | — |
| GET | `/api/v1/models/{id}/benchmarks` | All benchmark results for a model | `dataset` |
| GET | `/api/v1/patents/feed` | Chronological patent stream | `cpc[]`, `assignee[]`, `since`, `cursor` |
| GET | `/api/v1/datasets` | Dataset index | `modality`, `species`, `format`, `source` |
| GET | `/api/v1/datasets/{id}` | Dataset detail + loader snippet | — |
| GET | `/api/v1/facets` | Facet values with counts | `type` |
| POST | `/api/v1/benchmarks` | Publish a benchmark result (token-protected) | body: `BenchmarkResult` |
| GET | `/healthz`, `/readyz` | Health checks | — |

The `/discover` response includes facet counts so the UI sidebar updates in one request. Pagination is **cursor-based** (keyset), not offset, for the feeds.

### 9.3 Model spec sheet response (Pydantic v2)

```python
from pydantic import BaseModel, HttpUrl, Field


class HardwareReq(BaseModel):
    min_vram_gb: float
    train_gpu: str
    train_hours: float
    inference_cpu_p99_ms: float | None = None


class BenchmarkOut(BaseModel):
    dataset: str
    metric: str
    value: float
    std: float | None = None
    n_folds: int
    split_level: str


class ModelSpec(BaseModel):
    id: str
    name: str
    architecture: str
    task: str
    modalities: list[str]
    param_count: int = Field(ge=0)
    input_contract: dict[str, object]
    hardware: HardwareReq
    benchmarks: list[BenchmarkOut]
    checkpoint_url: HttpUrl | None
    onnx_url: HttpUrl | None
    train_command: str
    paper_doi: str | None
    license: str
```

### 9.4 Caching (Redis)

- Cache key = `sha256(path + sorted query params)`.
- TTLs: `/discover` 5 min, `/models/{id}` 1 h, `/patents/feed` 15 min, `/facets` 10 min.
- The ingest service publishes an invalidation message on a Redis channel after each sync; the API drops affected key prefixes.
- Query embeddings are cached separately (24 h) because they are the most expensive part of a search.
- Rate limiting: sliding window per IP in Redis.

**Phase 4 exit criteria:**

- p95 latency < 200 ms for `/discover` on 1M works (warm cache < 20 ms).
- OpenAPI schema generated and published; a typed TS client is generated from it for Phase 5.
- Integration tests run against a real Postgres + pgvector container.

---

## 10. Phase 5 (Polish): Research Dashboard

Next.js 15 App Router + Tailwind CSS. Server components fetch from the API; interactive visualizers are client components.

### 10.1 Pages

| Route | Content |
|---|---|
| `/` | Search bar + facet sidebar + mixed results (papers, models, datasets, patents) |
| `/models/[id]` | Spec sheet, benchmark table/chart, hardware, **copy-to-clipboard train command**, ONNX download |
| `/datasets/[id]` | Metadata, subject/session counts, loader code snippet, preview in `EphysViewer` or `ConnectomeViewer` |
| `/patents` | Chronological feed, CPC/assignee filters, side-by-side comparison table (select 2–4 patents) |
| `/benchmarks` | Leaderboards per dataset and metric |

### 10.2 `ConnectomeViewer` (Three.js / react-three-fiber)

- Nodes: `InstancedMesh` spheres at region MNI coordinates, color by network (e.g. Yeo-7), size by degree or strength.
- Edges: one `LineSegments` geometry with per-vertex color, opacity and color mapped to weight; threshold slider filters edges on the GPU side by rebuilding the index buffer only.
- Optional translucent cortical surface (fsaverage GLB) for context.
- Hover/click on a node shows region label and top connections. `OrbitControls` for navigation.
- Handles 400 nodes / ~80k edges at 60 fps on integrated GPUs.

### 10.3 `EphysViewer` (WebGL2)

- Data is fetched as chunked `Float32Array` tiles (per channel group × time range) from the API, which reads the Zarr cache.
- **Min/max decimation** per pixel column on the server for zoomed-out views (no aliasing hides spikes); raw samples when zoomed in.
- Each channel is drawn as a `LINE_STRIP` with a per-channel vertical offset in the vertex shader; gain and offset are uniforms, so zoom/scroll is just a uniform update.
- Interactions: wheel to zoom time, shift+wheel to scrub channels, drag to pan, per-channel gain, event markers overlay.
- Target: 256 channels × 10 s at 30 kHz visible region, interactive at 60 fps.

**Phase 5 exit criteria:**

- Lighthouse performance ≥ 90 on the explorer page.
- Playwright tests for search → model page → copy command flow.
- Both visualizers render the reference datasets without frame drops on a mid-range laptop.

---

## 11. Testing, CI & Quality Gates

| Layer | Tests |
|---|---|
| Data | Synthetic-signal filter tests, window index property tests (`hypothesis`), leakage tests, reader tests on tiny fixture BIDS/NWB files |
| Models | Shape tests, overfit-one-batch test (loss → ~0), deterministic seed test, ONNX parity |
| Ingest | Recorded HTTP fixtures (`respx`), dedup/tagging golden sets, idempotency tests |
| API | Contract tests vs. OpenAPI, Postgres integration tests via `testcontainers` |
| Web | `vitest` unit tests, Playwright E2E |

CI gates on every PR: `ruff`, `mypy --strict` (library), `pytest` with ≥ 85% coverage on `packages/neuroforge`, `eslint`, `tsc --noEmit`, web build.

---

## 12. Local Development

```bash
# prerequisites: Docker, uv, Node 20+, pnpm
git clone <repo-url> neuro-forge && cd neuro-forge

# infra
docker compose up -d            # postgres+pgvector, redis, mlflow

# python
uv sync --all-packages
uv run alembic -c services/ingest/alembic.ini upgrade head
uv run pytest

# train a model
uv run neuroforge train model=eeg_conformer data=bci_iv_2a

# run ingestion once
uv run python -m ingest.scheduler --once

# api
uv run uvicorn api.main:app --reload --port 8000

# web
cd apps/web && pnpm install && pnpm dev
```

Environment variables (`.env`):

```bash
DATABASE_URL=postgresql+asyncpg://neuroforge:neuroforge@localhost:5432/neuroforge
REDIS_URL=redis://localhost:6379/0
MLFLOW_TRACKING_URI=http://localhost:5000
NCBI_API_KEY=               # optional, raises PubMed limit to 10 req/s
NCBI_EMAIL=you@example.org  # required by NCBI usage policy
PATENTSVIEW_API_KEY=
NEUROFORGE_CACHE_DIR=~/.cache/neuroforge
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

## 13. Roadmap & Milestones

| Milestone | Scope | Target |
|---|---|---|
| **v0.1** | Phase 0 + Phase 1: data types, readers, streaming, preprocessing, datasets, splits | Weeks 1–4 |
| **v0.2** | Phase 2: three models, Hydra configs, CV runner, ONNX export, model cards | Weeks 5–9 |
| **v0.3** | Library published to PyPI with docs and reproduction notebooks | Week 10 |
| **v0.4** | Phase 3: scrapers, dedup, tagging, schema, embeddings | Weeks 11–14 |
| **v0.5** | Phase 4: FastAPI hybrid search and endpoints | Weeks 15–17 |
| **v1.0** | Phase 5: dashboard + visualizers, public launch | Weeks 18–22 |

After v1.0: more models (NDT / POYO-style spike transformers, EEG foundation models such as LaBraM-style pretraining), MOABB-wide benchmarks, community model submissions, and contributor-submitted dataset loaders.

---

## 14. Build Prompts (Phase-by-Phase)

Use these prompts with an AI coding agent **one at a time, in order**. Each one is self-contained, refers to the contracts above, and ends with exit criteria. Do not run a later prompt until the previous phase's tests pass.

### 14.0 Master context prompt (prepend to every phase prompt)

```text
You are a Principal Neuroinformatics Architect and Staff Full-Stack AI Engineer.
You are building NeuroForge, an open-source platform for computational neuroscience,
brain-computer interfaces, and neuro-AI. It centralizes datasets, data loaders,
model architectures with training recipes, benchmarks, papers, and patents.

Non-negotiable engineering rules:
- Python 3.11+, full type hints, mypy --strict clean, ruff clean.
- No pseudo-code, no "TODO: implement", no placeholder functions in core logic.
- Every public function has a unit test. Use tiny synthetic fixtures; never require
  downloading real datasets in unit tests (mark those tests @pytest.mark.network).
- packages/neuroforge must not import anything from services/ or apps/.
- Follow the repository layout and data contracts in README.md exactly.
- Prefer community-standard libraries (mne, mne-bids, pynwb, zarr, torch, lightning,
  torch_geometric, hydra, fastapi, sqlalchemy 2.0, pydantic v2).
- When a choice is ambiguous, pick the option that prevents data leakage and keeps
  results reproducible, and state the choice in a docstring.
- Out of scope: auth/user accounts, social features, LLM chat, hosting raw data.
```

### 14.1 Phase 0 — Foundations

```text
Create the NeuroForge monorepo skeleton.

1. uv workspace root pyproject.toml with members packages/neuroforge, services/ingest,
   services/api. Each member has its own pyproject.toml with src/ layout.
2. Configure ruff (line length 100, select E,F,I,B,UP,N,SIM), mypy strict for
   packages/neuroforge, pytest with pytest-cov.
3. docker-compose.yml with services: postgres (pgvector/pgvector:pg16, healthcheck),
   redis:7-alpine, mlflow (sqlite backend, local artifact volume).
4. .github/workflows/python.yml: uv sync, ruff check, ruff format --check, mypy, pytest.
5. .pre-commit-config.yaml with ruff and basic hygiene hooks.
6. .env.example with the variables listed in README section 12.

Exit criteria: `docker compose up -d && uv sync --all-packages && uv run pytest` passes
on a clean clone with one trivial test per package.
```

### 14.2 Phase 1 — Data abstractions & ingestion (CRITICAL)

```text
Implement packages/neuroforge/src/neuroforge/data/ exactly per README section 6.

1. types.py: RecordingKey, ContinuousRecording, SpikeRecording, Connectome dataclasses
   with a validate() method on each (shape checks, sfreq > 0, monotonic spike times,
   square adjacency, label/coord length matches).
2. bids.py: BIDSReader(root: str | PathLike, fs: fsspec filesystem | None) that lists
   subjects/sessions/tasks/runs via mne-bids, returns ContinuousRecording with lazy data,
   montage from electrodes.tsv, events from events.tsv, bad channels from channels.tsv,
   PowerLineFrequency from *_eeg.json. Convert to SI units.
3. nwb.py: NWBReader that opens local or remote (remfile + h5py) NWB files and returns
   ContinuousRecording from ElectricalSeries (applying conversion and offset, channel
   metadata from the electrodes table) and SpikeRecording from the Units table
   (spike_times, ids, quality, waveform_mean if present, brain area from electrodes),
   plus trials and behavior TimeSeries.
4. remote.py: open_dandi_nwb(dandiset_id, asset_path, version) and
   openneuro_fs() returning s3fs.S3FileSystem(anon=True) rooted at openneuro.org;
   list_openneuro_dataset(ds_id). Include a block-cache option via fsspec.
5. store.py: ZarrCache that materializes preprocessed recordings to
   {cache_dir}/{dataset}/{subject}/{session}/{run}.zarr with time-major chunks
   (~2 s), Blosc zstd level 5 bitshuffle, and a manifest.json holding the
   preprocessing config hash; invalidate on hash mismatch. Also an HDF5 backend with
   the same interface.
6. preprocessing.py: bandpass (SOS, causal and zero-phase), notch with harmonics,
   common_average_reference excluding bad channels, resample (polyphase),
   bin_spikes, zscore with fit/transform separation. Plus a Pipeline class built from
   a Pydantic config with a stable config_hash().
7. windowing.py: window_starts(), event-locked epoch extraction, seconds→samples
   conversion per recording.
8. splits.py: group_kfold and train_val_test_split over RecordingKey at
   subject|session|run level with a runtime disjointness assertion.
9. datasets.py: WindowedDataset (map-style, lazy per-worker Zarr handles),
   StreamingWindowDataset (IterableDataset, worker sharding, bounded shuffle buffer,
   seedable), SpikeTrialDataset, ConnectomeDataset (torch_geometric Data with top-k
   sparsification).

Tests (all synthetic, no network):
- 10 Hz + 50 Hz sine: after notch(50), 50 Hz power drops > 30 dB; 10 Hz within 0.5 dB.
- Bandpass passband/stopband attenuation checks.
- CAR output has zero mean across good channels.
- hypothesis tests for window_starts (no out-of-bounds, correct count, stride respected).
- A deliberately leaky split raises AssertionError.
- Tiny fixture BIDS dataset and tiny NWB file generated in conftest.py.
- DataLoader with num_workers=2 over WindowedDataset returns deterministic batches
  given a seed.

Exit criteria: all tests pass, mypy strict clean, and a script
examples/stream_dandi.py streams one NWB file from DANDI 000128 without full download.
```

### 14.3 Phase 2 — Model zoo & training recipes (CRITICAL)

```text
Implement packages/neuroforge/src/neuroforge/{models,training}/ per README section 7.

1. models/eeg_conformer.py: EEGConformer(n_channels, n_samples, n_outputs, d_model=40,
   n_heads=10, depth=6, dropout=0.5, temporal_kernel=25, pool_kernel=75,
   pool_stride=15). Patch embedding (temporal conv → spatial conv → BN → ELU → avg pool
   → dropout → 1x1 projection), pre-norm Transformer encoder, classification/regression
   head. Compute flattened size from a dummy forward in __init__.
2. models/tcn.py: TCN with dilated causal Conv1d residual blocks, weight norm,
   configurable levels/kernel/channels; expose receptive_field property.
3. models/lfads.py: LFADS with bidirectional GRU encoder → g0 posterior; optional
   controller GRU with inferred-input posterior; generator GRU (GRUCell unrolled);
   factors and log-rate readouts; coordinated dropout; reparameterization; Poisson
   NLL + KL with linear warm-up; L2 on generator recurrent weights; posterior-mean
   inference mode for export.
4. models/brain_gnn.py: BrainGNN with edge-weighted GCNConv or GATv2Conv(edge_dim=1),
   TopKPooling, mean||max readout, MLP head; batching via torch_geometric.
5. training/metrics.py: pearson_r, co_bps (per README formula), accuracy,
   cohen_kappa, roc_auc wrappers (torchmetrics), all with tests on known values.
6. training/lit_modules.py: ClassificationModule, RegressionModule,
   LatentDynamicsModule, GraphModule. Optimizer and scheduler instantiated from Hydra
   config via hydra.utils.instantiate. Log metrics under train/ and val/ prefixes.
7. configs/: train.yaml + data/model/optimizer/scheduler groups per README 7.3,
   validated by Pydantic schemas on load.
8. training/cv.py: GroupKFold runner per README 7.4. Normalizer fit on train fold only
   and saved with the checkpoint. Writes BenchmarkResult JSON with per-fold metrics,
   mean, std, config hash, git SHA, hardware info, wall time.
9. training/export.py: ONNX export (opset 17, dynamic batch), onnxruntime parity check
   (max abs diff ≤ 1e-4), CPU latency p50/p99, preprocessing.json with SOS coefficients,
   channel order, sfreq, normalization stats.
10. training/cli.py: `neuroforge train`, `neuroforge export`, `neuroforge cv` entry points.
11. registry.py: ModelCard and BenchmarkResult Pydantic models + YAML I/O.

Tests:
- Shape tests for every model with random inputs.
- Overfit-one-batch test for each model (loss decreases by > 90% in 200 steps).
- Seeded determinism test on CPU.
- ONNX parity test for EEGConformer and TCN.
- Smoke configs (configs/smoke/*.yaml) that run 2 steps on synthetic data in < 60 s.

Exit criteria: `uv run neuroforge train model=eeg_conformer data=bci_iv_2a` runs
end-to-end, and each model has a model_card.yaml with reference results.
```

### 14.4 Phase 3 — Literature & patent ingestion engine (HIGH)

```text
Implement services/ingest per README section 8.

1. db/models.py: SQLAlchemy 2.0 typed ORM (Mapped[], mapped_column) for all tables in
   README 8.6, with pgvector Vector(768), generated tsvector columns (weights A/B/C),
   and all listed indexes (GIN, HNSW vector_cosine_ops, pg_trgm). Alembic initial
   migration that also runs CREATE EXTENSION vector and pg_trgm.
2. clients/arxiv.py: async Atom client (feedparser) for q-bio.NC, cs.NE, and keyword-
   filtered cs.AI / stat.ML; paginated; 1 req / 3 s.
3. clients/biorxiv.py: details endpoint by date interval with cursor pagination,
   category == neuroscience; pubs endpoint for preprint→published DOI mapping.
4. clients/pubmed.py: esearch (usehistory=y) + efetch XML parsing (lxml) for title,
   abstract, authors, DOI, MeSH terms; 3 or 10 req/s depending on NCBI_API_KEY;
   include tool and email params.
5. clients/patentsview.py: PatentSearch API client with X-Api-Key, CPC filters
   A61B5/24–A61B5/398, legacy A61B5/04*, G06N3/*, G16H/*, G06F3/015; paginated;
   extracts assignees, inventors, CPC codes, first claim.
6. Shared BaseClient with rate limiter and tenacity retries (per README 8.2); all
   clients yield a normalized RawRecord Pydantic model.
7. dedup.py: DOI reconciliation, then pg_trgm candidate retrieval + rapidfuzz
   token_sort_ratio ≥ 93, author and year checks; 85–93 → review queue table.
8. tagging.py: rule-based taggers for modality, species, task type, and code links
   with rule_id and confidence; rules loaded from a YAML file.
9. embeddings.py: SPECTER2 batch embedder with embedding_model version tracking.
10. scheduler.py: APScheduler jobs (arXiv/bioRxiv 6 h, PubMed 24 h, patents 7 d),
    Redis lock per job, sync_state watermarks, idempotent upserts on
    (source, external_id), Redis pub/sub invalidation message after each run.
    `--once` flag to run all jobs once and exit.

Tests: respx-recorded HTTP fixtures for every client, dedup golden set, tagging golden
set, idempotency test (two runs → identical row counts), migration up/down test
against a testcontainers Postgres with pgvector.

Exit criteria: `python -m ingest.scheduler --once` populates a fresh DB from all
sources for a 7-day window with zero duplicates on re-run.
```

### 14.5 Phase 4 — Hybrid search & discovery API (MEDIUM)

```text
Implement services/api per README section 9.

1. FastAPI app with lifespan-managed async SQLAlchemy engine and redis.asyncio client.
2. search/hybrid.py: parallel FTS (websearch_to_tsquery, ts_rank_cd) and pgvector
   cosine (HNSW, set hnsw.ef_search) retrieval with facet filters applied in both,
   merged by Reciprocal Rank Fusion (k=60). Query embedding via the same SPECTER2
   model, cached in Redis for 24 h.
3. Routers: /api/v1/discover (with facet counts), /api/v1/models/{id},
   /api/v1/models/{id}/benchmarks, /api/v1/patents/feed (keyset pagination by
   publication_date, id), /api/v1/datasets, /api/v1/datasets/{id}, /api/v1/facets,
   POST /api/v1/benchmarks (bearer token), /healthz, /readyz.
4. Pydantic v2 schemas for every request and response (README 9.3), with
   model_config = ConfigDict(from_attributes=True).
5. cache.py: response cache decorator keyed by sha256(path + sorted params) with the
   TTLs in README 9.4; subscriber that invalidates key prefixes on ingest messages;
   Redis sliding-window rate limiter middleware.
6. Structured JSON logging, request IDs, CORS for the web origin, gzip.

Tests: testcontainers Postgres+pgvector and Redis; seed fixtures; tests for every
endpoint, facet filtering correctness, RRF ordering on a crafted example, cache
hit/miss and invalidation, pagination stability.

Exit criteria: OpenAPI schema exported to apps/web/openapi.json; p95 /discover
< 200 ms on a seeded 100k-row DB locally.
```

### 14.6 Phase 5 — Research dashboard (POLISH)

```text
Implement apps/web per README section 10 with Next.js 15 App Router, TypeScript strict,
Tailwind CSS.

1. lib/api.ts: typed client generated from openapi.json (openapi-typescript +
   openapi-fetch).
2. Explorer page: server-rendered results, FacetSidebar driven by URL search params
   (shareable URLs), result cards per type (paper, model, dataset, patent).
3. RecipeCard and /models/[id]: spec sheet, benchmark table and bar chart,
   hardware panel, copy-to-clipboard training command, ONNX/checkpoint links.
4. /patents: feed with CPC and assignee filters, infinite scroll via cursor,
   PatentTable comparison of 2–4 selected patents (CPC, assignee, dates, first claim).
5. ConnectomeViewer (client component, @react-three/fiber + drei): InstancedMesh nodes
   at MNI coords, LineSegments edges with weight-mapped color/opacity, threshold
   slider, hover tooltip, OrbitControls, optional fsaverage GLB surface.
6. EphysViewer (client component, raw WebGL2): tiled Float32Array fetches, server
   min/max decimation when zoomed out, per-channel offset in vertex shader, uniforms
   for gain/time window, wheel zoom, shift+wheel channel scrub, drag pan, event
   markers.

Tests: vitest for utilities and components, Playwright E2E for search → model page →
copy command, and a visual smoke test for both viewers with fixture data.

Exit criteria: Lighthouse performance ≥ 90 on the explorer; both viewers interactive
at 60 fps with the reference datasets.
```

---

## 15. Contributing

- **Add a dataset loader:** implement a reader returning one of the canonical types, add a Hydra data config, add a tiny fixture test. See `docs/adding-a-dataset.md`.
- **Add a model:** `nn.Module` + LightningModule + Hydra config + smoke config + model card with reproduced benchmark. See `docs/adding-a-model.md`.
- **Add a literature/patent source:** subclass `BaseClient`, yield `RawRecord`, add recorded HTTP fixtures. See `docs/adding-a-source.md`.

All benchmark claims must come from the CV runner with `split_level: subject` unless the model card explicitly states otherwise.

---

## 16. License

- Code: Apache-2.0.
- Model cards and documentation: CC BY 4.0.
- Datasets keep their original licenses (DANDI and OpenNeuro datasets are mostly CC0 or CC BY 4.0); NeuroForge only indexes and streams them.
