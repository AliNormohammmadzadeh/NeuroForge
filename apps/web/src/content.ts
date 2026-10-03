export const ROADMAP: ReadonlyArray<{ title: string; body: string }> = [
  {
    title: "Pick one signal",
    body: "EEG motor imagery, sorted spikes, or a connectivity matrix. Do not mix them in a first model.",
  },
  {
    title: "Open one dataset and one paper",
    body: "The dataset links and the paper that named the recipe are below. Read those before a leaderboard.",
  },
  {
    title: "Run the loop with no download",
    body: "uv run neuroforge train --model eeg_conformer --steps 2",
  },
  {
    title: "Learn the split",
    body: "uv run neuroforge demo. A window split memorizes the person and scores higher. A subject split shares nobody and the score falls.",
  },
  {
    title: "Freeze the preprocessing",
    body: "Filter, rereference, and fit the z-score on training data only. The config hash is the cache key.",
  },
  {
    title: "Train the model for that field",
    body: "EEG-Conformer or the causal TCN, LFADS for spikes, BrainGNN for a connectome.",
  },
  {
    title: "Score the right metric",
    body: "Kappa for EEG. Bits per spike for held-out spike bins. Leave benchmark cards empty until a run here reproduces the number.",
  },
  {
    title: "Export only the EEG decoders",
    body: "uv run neuroforge export --model eeg_conformer --out model.onnx",
  },
];

export const LATER: ReadonlyArray<{ group: string; title: string; body: string }> = [
  {
    group: "A real number",
    title: "Train on a local BIDS recording",
    body: "Point the subject split at a folder you already have. The trainer still refuses a shared subject, and it still does not download the file.",
  },
  {
    group: "A real number",
    title: "Fill one benchmark card from a run here",
    body: "Kappa on one named EEG set, or bits per spike on one named spike set. The card stays empty until this repository reproduces the number.",
  },
  {
    group: "A real number",
    title: "Use the configs and Lightning modules already in the repo",
    body: "neuroforge train still runs a short synthetic loop. The YAML recipes and the Lightning modules are not on that path yet.",
  },
  {
    group: "See the signal",
    title: "Run an exported decoder in the browser",
    body: "Load the ONNX EEG model and score one synthetic trial on the page, next to the parity check the CLI already prints.",
  },
  {
    group: "See the signal",
    title: "Use a skull from the same MRI",
    body: "The cortex, cerebellum, and brainstem are the pial surface of OpenNeuro ds006128 subject 01. Scalp and skull are still smooth shells.",
  },
  {
    group: "See the signal",
    title: "Show a connectome you can threshold",
    body: "Regions as nodes and weights as edges. A slider drops weak edges. BrainGNN is the model that reads the matrix.",
  },
  {
    group: "See the signal",
    title: "Show one channel over time",
    body: "A window of EEG, or a spike raster, drawn from a local file. Zoom stays on the samples you already loaded.",
  },
  {
    group: "Find the source",
    title: "Give each model and each dataset its own page",
    body: "The home page lists the cards. A later page holds one model, its input shape, its train command, and its empty benchmark list.",
  },
  {
    group: "Find the source",
    title: "Search the literature from the site",
    body: "The CLI already asks arXiv and OpenAlex for title, authors, year, and a URL. The page does not yet.",
  },
  {
    group: "Find the source",
    title: "Search cards by meaning, not only by the words",
    body: "Keyword search is what /api/v1/discover does now. Embeddings come after the card text is the corpus, and they do not store full papers.",
  },
];

export const TRAIN_NEEDS: ReadonlyArray<{ title: string; body: string }> = [
  {
    title: "Environment",
    body: "Python 3.11 or newer and uv. uv sync --all-packages --group dev installs the library, the tests, and the API.",
  },
  {
    title: "Identity",
    body: "Every recording needs a dataset id and a subject id, plus session and run when those exist. That is the RecordingKey.",
  },
  {
    title: "Windows after the split",
    body: "Cut trials only after the groups are assigned. uv run neuroforge demo shows a window split memorizing the person.",
  },
  {
    title: "One input shape",
    body: "EEG models take (trials, channels, samples). LFADS takes (trials, time, neurons). BrainGNN takes (subjects, regions, regions).",
  },
  {
    title: "A local file, when you leave synthetic data",
    body: "The default trainer does not download BCI IV 2a, DANDI, or ABIDE. The remote extra streams NWB and OpenNeuro when you ask it to.",
  },
];

export const CORTEX_FIELDS = ["eeg-bci", "spikes", "connectomics"] as const;

export const DATA_KINDS = new Set(["archive", "benchmark"]);

const MONTHS = [
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
];

export function snapshotDate(isoDate: string): string {
  const [year, month, day] = isoDate.split("-");
  return `${Number(day)} ${MONTHS[Number(month) - 1]} ${year}`;
}

export function authorLine(names: string[]): string {
  const shown = names.slice(0, 3).join(", ");
  return names.length > 3 ? `${shown} et al.` : shown;
}

export function matchesQuery(text: string, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return text.toLowerCase().includes(needle);
}
