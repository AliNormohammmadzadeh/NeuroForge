import type { RoadmapPart } from "./learn";
import { LEARN } from "./learn";

export const ROADMAP: readonly RoadmapPart[] = [
  {
    title: "The head",
    aim: "Learn the three layers a voltage crosses, then open each layer in the scene. The mesh is one public brain. The skull and scalp shells are drawings.",
    video: LEARN.cortexVideo,
    watchNote:
      "The clip names gyri, sulci, and the six-layer neocortex. It does not name the gyri on this mesh.",
    parts: [
      { slug: "cortex", label: "Cortex" },
      { slug: "skull", label: "Skull" },
      { slug: "scalp", label: "Scalp" },
    ],
    sources: [LEARN.cortexVideo, LEARN.openneuro, LEARN.openneuroDoi, LEARN.freesurfer, LEARN.buzsaki],
    steps: [
      {
        title: "Start on the cortex",
        body: "The folds are a pial surface: the gray-matter boundary FreeSurfer draws on an MRI. This one is OpenNeuro ds006128, subject 01, released CC0, with cerebellum and brainstem from the same surfaces. Ridges are gyri. Creases are sulci. The darker paint marks the creases. Gyri are not labeled yet, and this is not a clinical scan.",
      },
      {
        title: "Then the skull",
        body: "Bone is a volume conductor. It spreads a sharp spike into a slow field, so a rhythm at the scalp is not a list of neurons. The shell in the scene is a sphere, not bone from that MRI. Buzsáki, Anastassiou, and Koch (2012) separate EEG, ECoG, the local field, and spikes as the same currents read at different distances.",
      },
      {
        title: "Then the scalp",
        body: "A scalp electrode stops on the skin. It hears a sum of many postsynaptic currents that survived the bone, mostly from cortex under that disc. A single spike does not survive the trip, and neither does a deep nucleus. Open Scalp EEG next if you want the model that reads this sum.",
      },
    ],
  },
  {
    title: "The electrode",
    aim: "Closer to the neuron, the picture is sharper and harder to place. Open one device at a time. Every implant card is a schematic, and it is not a procedure.",
    video: LEARN.eegVideo,
    watchNote:
      "Start with the two-minute EEG clip. The other links are a participant describing a click, a page of BrainGate cursor videos, and a one-minute description of the PRIME study. None of them is a placement guide.",
    parts: [
      { slug: "eeg", label: "Scalp EEG" },
      { slug: "surface", label: "Surface film" },
      { slug: "stent", label: "Endovascular stent" },
      { slug: "utah", label: "Rigid microarray" },
      { slug: "threads", label: "Flexible threads" },
      { slug: "connexus", label: "Dense penetrating array" },
    ],
    sources: [
      LEARN.eegVideo,
      LEARN.buzsaki,
      LEARN.stentVideo,
      LEARN.oxley,
      LEARN.synchron,
      LEARN.braingateVideos,
      LEARN.hochberg,
      LEARN.blackrock,
      LEARN.primeVideo,
      LEARN.neuralink,
      LEARN.precision,
      LEARN.paradromics,
    ],
    steps: [
      {
        title: "Outside the head",
        body: "Scalp EEG hears a rhythm. Nothing is implanted. A trial is one attempt, a channel is one disc, and a sample is one time point. MOABB is the benchmark library for that shape. This site does not download it. CSP is the classical spatial baseline. EEGNet and EEG-Conformer are compact networks for the same tensor.",
      },
      {
        title: "On the surface, or in a vein",
        body: "A film on the cortex and a stent in the superior sagittal sinus both hear a field potential from a patch, not a single spike. Precision's public description counts 1,024 electrodes on a film that does not enter the tissue. The first published human Stentrode system used 16 electrodes and recorded electrocorticography through the vessel wall. Neither card is a procedure.",
      },
      {
        title: "Inside the cortex",
        body: "Utah needles, Neuralink threads, and the Connexus array end about a millimeter and a half in and can hear spikes from nearby neurons. The N1 brochure counts 1,024 electrodes on 64 threads. Paradromics' public count for Connexus is 421 electrodes. Those devices are investigational. The threads picture is not a robot and not a procedure. Do not copy a bits-per-second claim onto a card.",
      },
    ],
  },
  {
    title: "One signal",
    aim: "Pick EEG, spikes, or a connectome before you pick a model. A first model uses one of them. Mixing the tensors teaches you neither.",
    parts: [
      { slug: "eeg", label: "Scalp EEG" },
      { slug: "threads", label: "Flexible threads" },
      { slug: "atlas", label: "the atlas" },
    ],
    sources: [LEARN.eegnet, LEARN.conformer, LEARN.csp, LEARN.lfads, LEARN.braingnn, LEARN.moabbPaper],
    steps: [
      {
        title: "EEG",
        body: "The tensor is trials, channels, samples. Motor imagery is the usual first task: the person imagines a movement and the rhythm under the disc changes. CSP finds spatial filters. EEG-Conformer and the causal TCN are the networks in this repository. Use the TCN when latency matters, because a causal convolution does not look ahead in time.",
      },
      {
        title: "Spikes",
        body: "The tensor is trials, time, neurons. Each number is a count of action potentials in a bin, not a scalp voltage. LFADS reads that count and infers a smoother firing rate. Do not feed it a scalp rhythm. The Hochberg 2006 BrainGate result is the historical picture of a person moving a cursor from this kind of signal.",
      },
      {
        title: "A connectome",
        body: "The tensor is subjects, regions, regions. Each cell is a connection weight between two regions, not a voltage and not a spike. BrainGNN reads that matrix and can point at regions that drove the decision. Mixing it with EEG in one first model teaches you neither shape.",
      },
    ],
  },
  {
    title: "A split you can publish",
    aim: "A window split can memorize the person. The cut has to refuse a shared subject, session, or run. Learn the bug on synthetic people before you touch a recording.",
    parts: [],
    sources: [LEARN.groupKfold, LEARN.lotte],
    steps: [
      {
        title: "Name the recording",
        body: "Every recording needs a dataset id and a subject id, plus session and run when those exist. That is the RecordingKey. Windows from the same person are not independent trials. If a person appears on both sides of the cut, the model can recognize the person instead of the task.",
      },
      {
        title: "Run neuroforge demo",
        body: "Eight synthetic people, one class each, so the class is the person. A window split cuts time and shares all 8, then scores 1.00. Holding out the last two people shares nobody and scores 0.50, which is chance when the held-out people are new. The 1.00 is the bug. Seed 0 prints both. GroupKFold is the same idea in scikit-learn: the group is the person.",
      },
      {
        title: "Fit only on the training fold",
        body: "Filter, rereference, and fit the z-score after the split, on training data only. A scaler fit on the whole recording leaks the held-out mean. Cut windows after the groups are assigned. The config hash is the cache key, so a changed split does not reuse an old score. Lotte and colleagues review why a published EEG score is hard to compare when the split is sloppy.",
      },
    ],
  },
  {
    title: "Train, score, stop",
    aim: "A short synthetic run, the metric that matches the signal, then an export only for the EEG decoders. A benchmark card stays empty until a run in this repository reproduces the number.",
    parts: [],
    sources: [LEARN.kappa, LEARN.onnx, LEARN.conformer, LEARN.lfads],
    steps: [
      {
        title: "Two steps, no download",
        body: "uv run neuroforge train --model eeg_conformer --steps 2. Two steps check that the loop, the shape, and the split wiring run. They do not produce a score you can publish. The command does not download BCI Competition IV 2a, DANDI, or ABIDE.",
      },
      {
        title: "The metric for that signal",
        body: "Kappa for EEG, because chance is not zero when classes are unbalanced and Cohen's kappa subtracts that chance. Bits per spike for held-out spike bins. Leave the benchmark card empty until a run in this repository reproduces the number. A company slide is not that run.",
      },
      {
        title: "Export the EEG decoder",
        body: "uv run neuroforge export --model eeg_conformer --out model.onnx. ONNX is a portable graph. The CLI prints a numeric parity check so the exported graph agrees with the training graph on one batch. Spike and connectome models are not on that export path.",
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
