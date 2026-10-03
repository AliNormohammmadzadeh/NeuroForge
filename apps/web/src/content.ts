export const ROADMAP: ReadonlyArray<{
  title: string;
  aim: string;
  steps: ReadonlyArray<{ title: string; body: string }>;
}> = [
  {
    title: "The head",
    aim: "Select Cortex, Skull, then Scalp. Each card says where you are and what the voltage does there.",
    steps: [
      {
        title: "Start on the cortex",
        body: "The folds are the pial surface of OpenNeuro ds006128, subject 01. Ridges are gyri. Creases are sulci. The darker paint marks the creases.",
      },
      {
        title: "Then the skull",
        body: "Bone spreads a spike into a slow rhythm. The shell in the scene is a drawing, not bone from that MRI.",
      },
      {
        title: "Then the scalp",
        body: "A scalp electrode stops on the skin. It hears the sum that survived the bone, not a single neuron.",
      },
    ],
  },
  {
    title: "The electrode",
    aim: "Closer to the neuron, the picture is sharper and harder to place. Read one device at a time.",
    steps: [
      {
        title: "Outside the head",
        body: "Scalp EEG hears a rhythm. Nothing is implanted. MOABB is the benchmark library, and this site does not download it.",
      },
      {
        title: "On the surface, or in a vein",
        body: "A film on the cortex and a stent in the superior sagittal sinus both hear a field potential. The first published Stentrode used 16 electrodes. Neither card is a procedure.",
      },
      {
        title: "Inside the cortex",
        body: "Utah needles, Neuralink threads, and the Connexus array end about a millimeter and a half in and can hear spikes. The N1 brochure counts 1,024 electrodes on 64 threads. Those devices are investigational. The threads picture is not a robot and not a procedure.",
      },
    ],
  },
  {
    title: "One signal",
    aim: "Pick EEG, spikes, or a connectome. A first model uses one of them.",
    steps: [
      {
        title: "EEG",
        body: "The tensor is trials, channels, samples. EEG-Conformer or the causal TCN. Use the TCN when latency matters.",
      },
      {
        title: "Spikes",
        body: "The tensor is trials, time, neurons. LFADS reads that. Do not feed it a scalp rhythm.",
      },
      {
        title: "A connectome",
        body: "The tensor is subjects, regions, regions. BrainGNN reads that matrix. Mixing it with EEG in one first model teaches you neither.",
      },
    ],
  },
  {
    title: "A split you can publish",
    aim: "A window split can memorize the person. The cut has to refuse a shared subject, session, or run.",
    steps: [
      {
        title: "Name the recording",
        body: "Every recording needs a dataset id and a subject id, plus session and run when those exist. That is the RecordingKey.",
      },
      {
        title: "Run neuroforge demo",
        body: "Eight synthetic people, one class each. A window split shares all 8 and scores 1.00. Holding out two people shares nobody and scores 0.50. The 1.00 is the bug. Seed 0 prints both.",
      },
      {
        title: "Fit only on the training fold",
        body: "Filter, rereference, and fit the z-score after the split, on training data only. Cut windows after the groups are assigned. The config hash is the cache key.",
      },
    ],
  },
  {
    title: "Train, score, stop",
    aim: "A short synthetic run, the metric that matches the signal, then an export only for the EEG decoders.",
    steps: [
      {
        title: "Two steps, no download",
        body: "uv run neuroforge train --model eeg_conformer --steps 2. The command does not download BCI Competition IV 2a, DANDI, or ABIDE.",
      },
      {
        title: "The metric for that signal",
        body: "Kappa for EEG. Bits per spike for held-out spike bins. Leave the benchmark card empty until a run in this repository reproduces the number.",
      },
      {
        title: "Export the EEG decoder",
        body: "uv run neuroforge export --model eeg_conformer --out model.onnx. The CLI prints a numeric parity check. Spike and connectome models are not on that export path.",
      },
    ],
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
