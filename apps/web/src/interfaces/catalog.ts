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
  },
];

export function interfaceBySlug(slug: string): InterfaceModel {
  return INTERFACES.find((item) => item.slug === slug) ?? INTERFACES[4];
}
