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
