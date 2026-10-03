export interface LearnLink {
  label: string;
  href: string;
  kind: "video" | "paper" | "page" | "data";
  /** YouTube id for a concept explainer. Procedure clips are not embedded. */
  embed?: string;
}

export interface ScenePart {
  slug: string;
  label: string;
}

export interface RoadmapStep {
  title: string;
  body: string;
}

export interface RoadmapPart {
  title: string;
  aim: string;
  video?: LearnLink;
  watchNote?: string;
  parts: readonly ScenePart[];
  sources: readonly LearnLink[];
  steps: readonly RoadmapStep[];
}

export interface PartLearn {
  video?: LearnLink;
  watchNote: string;
  sources: readonly LearnLink[];
}

export const LEARN = {
  cortexVideo: {
    kind: "video",
    label: "2-Minute Neuroscience: Cerebral Cortex",
    href: "https://www.youtube.com/watch?v=7TK1LpjV5bI",
    embed: "7TK1LpjV5bI",
  },
  eegVideo: {
    kind: "video",
    label: "2-Minute Neuroscience: Electroencephalography (EEG)",
    href: "https://www.youtube.com/watch?v=tZcKT4l_JZk",
    embed: "tZcKT4l_JZk",
  },
  primeVideo: {
    kind: "video",
    label: "Neuralink: what the PRIME study is",
    href: "https://www.youtube.com/watch?v=z7o39CzHgug",
    embed: "z7o39CzHgug",
  },
  stentVideo: {
    kind: "video",
    label: "A Stentrode participant describing a click",
    href: "https://www.youtube.com/watch?v=NNo2StiHEnE",
    embed: "NNo2StiHEnE",
  },
  braingateVideos: {
    kind: "video",
    label: "BrainGate publication videos",
    href: "https://www.braingate.org/publication-videos/",
  },
  openneuro: {
    kind: "data",
    label: "OpenNeuro ds006128, subject 01",
    href: "https://openneuro.org/datasets/ds006128/versions/1.0.11",
  },
  openneuroDoi: {
    kind: "data",
    label: "Dataset DOI 10.18112/openneuro.ds006128.v1.0.11",
    href: "https://doi.org/10.18112/openneuro.ds006128.v1.0.11",
  },
  freesurfer: {
    kind: "page",
    label: "FreeSurfer, the pial surface",
    href: "https://surfer.nmr.mgh.harvard.edu/",
  },
  buzsaki: {
    kind: "paper",
    label: "Buzsáki, Anastassiou, and Koch 2012: EEG, ECoG, LFP and spikes",
    href: "https://doi.org/10.1038/nrn3241",
  },
  moabb: {
    kind: "page",
    label: "MOABB documentation",
    href: "https://moabb.neurotechx.com/docs/index.html",
  },
  moabbPaper: {
    kind: "paper",
    label: "Jayaram and Barachant 2018, MOABB",
    href: "https://doi.org/10.1088/1741-2552/aadea0",
  },
  eegnet: {
    kind: "paper",
    label: "Lawhern et al. 2018, EEGNet",
    href: "https://doi.org/10.1088/1741-2552/aace8c",
  },
  conformer: {
    kind: "paper",
    label: "Song et al. 2023, EEG-Conformer",
    href: "https://doi.org/10.1109/TNSRE.2022.3230250",
  },
  csp: {
    kind: "paper",
    label: "Blankertz et al. 2012, Common Spatial Patterns",
    href: "https://doi.org/10.3389/fnins.2012.00039",
  },
  lfads: {
    kind: "paper",
    label: "Pandarinath et al. 2018, LFADS",
    href: "https://doi.org/10.1038/s41592-018-0109-9",
  },
  braingnn: {
    kind: "paper",
    label: "Li et al. 2021, BrainGNN",
    href: "https://doi.org/10.1016/j.media.2021.102233",
  },
  lotte: {
    kind: "paper",
    label: "Lotte et al. 2018, ten years of EEG classifiers",
    href: "https://doi.org/10.1088/1741-2552/aab2f2",
  },
  groupKfold: {
    kind: "page",
    label: "scikit-learn GroupKFold",
    href: "https://scikit-learn.org/stable/modules/generated/sklearn.model_selection.GroupKFold.html",
  },
  kappa: {
    kind: "page",
    label: "scikit-learn Cohen's kappa",
    href: "https://scikit-learn.org/stable/modules/generated/sklearn.metrics.cohen_kappa_score.html",
  },
  onnx: {
    kind: "page",
    label: "ONNX",
    href: "https://onnx.ai/",
  },
  hochberg: {
    kind: "paper",
    label: "Hochberg et al. 2006, Nature",
    href: "https://doi.org/10.1038/nature04970",
  },
  oxley: {
    kind: "paper",
    label: "Oxley et al. 2021, first published human Stentrode system",
    href: "https://doi.org/10.1136/neurintsurg-2020-016862",
  },
  neuralink: {
    kind: "page",
    label: "Neuralink technology page",
    href: "https://neuralink.com/technology/",
  },
  synchron: {
    kind: "page",
    label: "Synchron technology page",
    href: "https://synchron.com/technology",
  },
  blackrock: {
    kind: "page",
    label: "Blackrock Utah array",
    href: "https://blackrockneurotech.com/products/utah-array/",
  },
  precision: {
    kind: "page",
    label: "Precision Neuroscience",
    href: "https://www.precisionneuro.io/",
  },
  paradromics: {
    kind: "page",
    label: "Paradromics Connexus",
    href: "https://paradromics.com/connexus/",
  },
} as const satisfies Record<string, LearnLink>;
