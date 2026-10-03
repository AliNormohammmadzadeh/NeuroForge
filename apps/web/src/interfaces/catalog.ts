import type { PartLearn } from "../learn";
import { LEARN } from "../learn";

export interface PartStep {
  title: string;
  body: string;
}

export interface HeadPart {
  slug: "scalp" | "skull" | "cortex";
  name: string;
  role: string;
  color: string;
  what: string;
  signal: string;
  steps: readonly PartStep[];
  learn: PartLearn;
}

export const HEAD_PARTS: readonly HeadPart[] = [
  {
    slug: "scalp",
    name: "Scalp",
    role: "The outside",
    color: "#e7c2b4",
    what: "Skin over the skull. A scalp electrode stops on this surface.",
    signal: "The voltage here is a blurred sum. A single spike has already been smoothed away.",
    steps: [
      {
        title: "Where the electrode stops",
        body: "Skin over the skull. A scalp electrode ends on this surface. Nothing is implanted.",
      },
      {
        title: "What still arrives",
        body: "A single spike does not. Bone and skin have already turned it into a slow sum of many neurons.",
      },
      {
        title: "What a model can use",
        body: "Rhythms and spatial patterns. CSP and EEG-Conformer are built for that sum, not for one neuron. The tensor is trials, channels, samples.",
      },
    ],
    learn: {
      video: LEARN.eegVideo,
      watchNote: "The clip is the sum a scalp electrode hears. Nothing is implanted.",
      sources: [LEARN.eegVideo, LEARN.moabb, LEARN.moabbPaper, LEARN.eegnet, LEARN.csp],
    },
  },
  {
    slug: "skull",
    name: "Skull",
    role: "The barrier",
    color: "#f4efe4",
    what: "Bone between the scalp and the brain. This shell is a drawing, not a measured skull.",
    signal: "Bone spreads the electrical field, so a spike becomes a slow rhythm by the time it reaches the scalp.",
    steps: [
      {
        title: "What this shell is",
        body: "Bone between the scalp and the brain. The shell in the scene is a drawing, not bone from the MRI.",
      },
      {
        title: "What the bone does to a spike",
        body: "It spreads the electrical field. By the time the voltage reaches the scalp, the spike is a slow rhythm.",
      },
      {
        title: "Why the two recordings differ",
        body: "An electrode outside the bone hears that spread field. An electrode under the bone hears a smaller patch of cortex. Distance, not a different kind of electricity, is the difference.",
      },
    ],
    learn: {
      watchNote:
        "There is no separate skull video. The EEG clip on Scalp is the rhythm that survived this bone. The review below is the source for that claim.",
      sources: [LEARN.buzsaki, LEARN.eegVideo],
    },
  },
  {
    slug: "cortex",
    name: "Cortex",
    role: "The source",
    color: "#d7b2a6",
    what: "The wrinkled surface in the scene is a pial mesh from one public MRI, OpenNeuro ds006128 subject 01. Cerebellum and brainstem are included. It is not a clinical scan.",
    signal: "A surface film sits on the gyri. Needles and threads end a short distance inside. A stent listens from a vein along the top.",
    steps: [
      {
        title: "Whose surface this is",
        body: "The pial mesh of OpenNeuro ds006128, subject 01, released CC0. Cerebellum and brainstem are from the same recording. It is not a clinical scan.",
      },
      {
        title: "Gyri and sulci",
        body: "Ridges are gyri. Creases are sulci. The darker paint marks the creases so the folds stay readable. Gyri are not named on the mesh yet.",
      },
      {
        title: "Where each electrode aims",
        body: "A film lies on the gyri. Needles and threads end a short distance in. A stent listens from a vein along the top, through the vessel wall. Open those cards for the count and the paper.",
      },
    ],
    learn: {
      video: LEARN.cortexVideo,
      watchNote: "The clip names gyri and sulci. It does not label the folds on this mesh.",
      sources: [LEARN.cortexVideo, LEARN.openneuro, LEARN.openneuroDoi, LEARN.freesurfer],
    },
  },
];

export function headPartBySlug(slug: string): HeadPart | undefined {
  return HEAD_PARTS.find((item) => item.slug === slug);
}

export interface InterfaceModel {
  slug: string;
  name: string;
  example: string;
  layer: string;
  color: string;
  sits: string;
  hears: string;
  chain: readonly [string, string, string, string];
  note: string;
  url: string;
  linkLabel: string;
  status: string;
  steps: readonly PartStep[];
  learn: PartLearn;
}

export const INTERFACES: readonly InterfaceModel[] = [
  {
    slug: "eeg",
    name: "Scalp EEG",
    example: "Motor imagery",
    layer: "On the scalp",
    color: "#7eb6ff",
    sits: "The electrode is on the skin. Skull and scalp stand between it and the cortex.",
    hears: "It hears a slow sum of many neurons. A single spike does not survive the trip through bone.",
    chain: ["A crowd of neurons", "An electrode on the scalp", "A rhythm, not a spike", "CSP or EEG-Conformer"],
    note: "This is the signal the EEG models in this repository train on. Nothing is implanted.",
    url: "https://moabb.neurotechx.com/docs/index.html",
    linkLabel: "MOABB",
    status: "Noninvasive",
    steps: [
      {
        title: "Nothing crosses the skin",
        body: "The disc sits on the scalp. Skull and scalp stand between it and the cortex. This is the signal the EEG models here train on.",
      },
      {
        title: "The shape of the recording",
        body: "A batch is trials, then channels, then samples. Motor imagery is the usual first task: the person imagines a movement, and the rhythm changes.",
      },
      {
        title: "Where to read next",
        body: "MOABB is the benchmark library for this signal. Open that link, then keep any files local. This site does not download them. Jayaram and Barachant, 2018, is the paper that describes the library.",
      },
    ],
    learn: {
      video: LEARN.eegVideo,
      watchNote: "Two minutes on what a scalp electrode measures, and what it cannot localize.",
      sources: [LEARN.eegVideo, LEARN.moabb, LEARN.moabbPaper, LEARN.eegnet, LEARN.conformer, LEARN.csp],
    },
  },
  {
    slug: "surface",
    name: "Surface film",
    example: "Precision Layer 7",
    layer: "On the cortex",
    color: "#e6c07a",
    sits: "A thin film lies on the cortical surface, under the skull, and does not enter the tissue.",
    hears: "It hears the local field of the patch underneath, including faster activity than a scalp electrode can see.",
    chain: ["A patch of cortex", "1,024 electrodes on a film", "A surface field potential", "A decoder for that patch"],
    note: "Precision describes Layer 7 as a film that conforms to the surface. Hospital ECoG grids are the coarser version of the same placement.",
    url: "https://www.precisionneuro.io/",
    linkLabel: "Precision Neuroscience",
    status: "Investigational as an implant",
    steps: [
      {
        title: "On the surface, not in it",
        body: "A thin film lies on the cortex, under the skull, and does not enter the tissue. Hospital ECoG grids are the coarser version of the same placement.",
      },
      {
        title: "A field from one patch",
        body: "It hears the local field under the film, including faster activity than a scalp electrode can see. Precision's public description counts 1,024 electrodes. That count is not a result reproduced here.",
      },
      {
        title: "Still not a spike list",
        body: "The recording is a surface field potential. A decoder for that patch is the matching model, not a single-neuron model. Buzsáki, Anastassiou, and Koch call this electrocorticography.",
      },
    ],
    learn: {
      watchNote:
        "Precision's public page describes a film of 1,024 electrodes that stays on the surface. That count is not a result reproduced here.",
      sources: [LEARN.precision, LEARN.buzsaki],
    },
  },
  {
    slug: "stent",
    name: "Endovascular stent",
    example: "Synchron Stentrode",
    layer: "In a vein",
    color: "#8fd0c0",
    sits: "Electrodes on a stent sit in a vein beside the motor cortex, the superior sagittal sinus. The skull is not opened to place the array.",
    hears: "They record electrocorticography through the vessel wall. The first published system used 16 electrodes. That is a field potential, not a single-neuron spike.",
    chain: ["Motor cortex next door", "Electrodes on a stent", "A field through the vessel", "Clicks on a computer"],
    note: "Synchron describes the Stentrode as investigational. The drawing shows the vessel. It is not a catheterization.",
    url: "https://synchron.com/technology",
    linkLabel: "Synchron",
    status: "Investigational",
    steps: [
      {
        title: "In the vein, beside cortex",
        body: "Electrodes on a stent sit in the superior sagittal sinus, next to motor cortex. The skull is not opened to place the array. The scene shows the vessel. It is not a catheterization.",
      },
      {
        title: "A field through the wall",
        body: "The first published system used 16 electrodes and recorded electrocorticography through the vessel wall. That is a field potential, not a single-neuron spike.",
      },
      {
        title: "What the public record is",
        body: "Synchron describes the Stentrode as investigational. The electrode count is from that published system, not a number this repository has rerun. Oxley and colleagues, 2021, is the first human report.",
      },
    ],
    learn: {
      video: LEARN.stentVideo,
      watchNote:
        "The clip is a participant describing a click from attempted movement. The drawing shows the vessel. It is not a catheterization.",
      sources: [LEARN.stentVideo, LEARN.oxley, LEARN.synchron, LEARN.buzsaki],
    },
  },
  {
    slug: "utah",
    name: "Rigid microarray",
    example: "Blackrock Utah array",
    layer: "Inside the cortex",
    color: "#d5dbe3",
    sits: "A bed of silicon needles crosses the surface and ends in the cortex, about a millimeter and a half in.",
    hears: "Each needle can hear spikes from neurons close to its tip. That is the event a spike model such as LFADS is built for.",
    chain: ["Neurons near a tip", "A rigid silicon needle", "Extracellular spikes", "A cursor or a prosthetic"],
    note: "Blackrock's Utah array is the array BrainGate used. The needles are stiff, which is the limitation flexible designs try to avoid.",
    url: "https://blackrockneurotech.com/products/utah-array/",
    linkLabel: "Blackrock Neurotech",
    status: "Human research since 2004",
    steps: [
      {
        title: "Needles, not a film",
        body: "A bed of stiff silicon needles crosses the surface and ends in the cortex, about a millimeter and a half in. Blackrock's Utah array is the array BrainGate used.",
      },
      {
        title: "Spikes at the tip",
        body: "Each needle can hear spikes from neurons close to its tip. That is the event a spike model such as LFADS is built for.",
      },
      {
        title: "The limitation",
        body: "The needles are stiff. Flexible threads are a later design trying to avoid that stiffness. This card does not describe how an array is placed. Hochberg and colleagues, Nature 2006, is the first human cursor from this kind of array.",
      },
    ],
    learn: {
      watchNote:
        "BrainGate's page collects the 2006 cursor and prosthetic videos. This card does not describe how an array is placed.",
      sources: [LEARN.braingateVideos, LEARN.hochberg, LEARN.blackrock, LEARN.lfads],
    },
  },
  {
    slug: "threads",
    name: "Flexible threads",
    example: "Neuralink N1",
    layer: "Inside the cortex",
    color: "#e6a15c",
    sits: "Fine polymer threads leave a sealed implant and rest in the cortex, near neurons. The implant records and sends the signal wirelessly.",
    hears: "Neuralink's public description says the electrodes detect action potentials. The N1 brochure counts 1,024 electrodes on 64 threads.",
    chain: ["Neurons beside a thread", "1,024 electrodes, 64 threads", "Wireless spike counts", "An app moves a cursor"],
    note: "The N1 implant in the PRIME study is investigational. This drawing shows where the threads sit. It is not the surgical robot and not a procedure.",
    url: "https://neuralink.com/technology/",
    linkLabel: "Neuralink",
    status: "Investigational",
    steps: [
      {
        title: "Threads in the cortex",
        body: "Fine polymer threads leave a sealed implant and rest near neurons. The implant records and sends the signal wirelessly. The picture is not the robot and not a procedure.",
      },
      {
        title: "What the brochure counts",
        body: "Neuralink's public description says the electrodes detect action potentials. The N1 brochure counts 1,024 electrodes on 64 threads. The PRIME study device is investigational.",
      },
      {
        title: "Which model hears spikes",
        body: "A list of spikes is not an EEG rhythm. LFADS is the spike model in this repository. EEG-Conformer is the wrong tool for this signal. The brochure count is 1,024 electrodes on 64 threads.",
      },
    ],
    learn: {
      video: LEARN.primeVideo,
      watchNote:
        "The clip says what the PRIME study is for: a wireless implant that reads movement intent. This drawing is not the robot and not a procedure.",
      sources: [LEARN.primeVideo, LEARN.neuralink, LEARN.lfads],
    },
  },
  {
    slug: "connexus",
    name: "Dense penetrating array",
    example: "Paradromics Connexus",
    layer: "Inside the cortex",
    color: "#c4b5ff",
    sits: "Many fine electrodes reach about 1.5 mm into the cortex, the depth Paradromics publishes for Connexus.",
    hears: "The company describes recordings from individual neurons, then a wireless link to an external decoder aimed at speech.",
    chain: ["Single neurons", "421 electrodes in cortex", "A wireless link", "Speech or a command"],
    note: "Connexus is an investigational device. The electrode count is the company's public description, not a result reproduced here.",
    url: "https://paradromics.com/connexus/",
    linkLabel: "Paradromics",
    status: "Investigational",
    steps: [
      {
        title: "A denser needle bed",
        body: "Many fine electrodes reach about 1.5 mm into the cortex, the depth Paradromics publishes for Connexus. The device is investigational.",
      },
      {
        title: "Their public description",
        body: "The company describes recordings from individual neurons, then a wireless link to an external decoder aimed at speech. The public count is 421 electrodes. That count is not a result reproduced here.",
      },
      {
        title: "Leave the marketing number out",
        body: "Do not copy a bits-per-second claim onto a card. A benchmark stays empty until a run in this repository reproduces it. The public count to remember is 421 electrodes, about 1.5 mm in.",
      },
    ],
    learn: {
      watchNote:
        "Paradromics describes individual-neuron recordings and a wireless link aimed at speech. Leave any bits-per-second claim off the card.",
      sources: [LEARN.paradromics, LEARN.lfads],
    },
  },
];

export function interfaceBySlug(slug: string): InterfaceModel {
  return INTERFACES.find((item) => item.slug === slug) ?? INTERFACES[4];
}
