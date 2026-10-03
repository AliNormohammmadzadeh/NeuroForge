export interface Resource {
  slug: string;
  name: string;
  kind: string;
  url: string;
  access: string;
  summary: string;
}

export interface Paper {
  title: string;
  year: number;
  authors: string[];
  venue: string;
  url: string;
  why: string;
  doi?: string | null;
  cited_by_count?: number | null;
}

export interface Field {
  slug: string;
  name: string;
  kicker: string;
  hue: string;
  summary: string;
  retrieved_on: string;
  snapshot_source: string;
  resources: Resource[];
  papers: Paper[];
}

export interface Algorithm {
  slug: string;
  name: string;
  field: string;
  implemented: boolean;
  anchor: [number, number, number];
  summary: string;
  use_when: string;
  url: string;
  command: string;
}

export interface ModelCard {
  slug: string;
  name: string;
  architecture: string;
  task: string;
  modalities: string[];
  param_count: number;
  summary: string;
  train_command: string;
  inputs: string;
  usage: string;
  license: string;
  benchmarks: unknown[];
}

export interface AtlasData {
  fields: Field[];
  algorithms: Algorithm[];
  models: ModelCard[];
}

export interface CortexSelection {
  algorithms: Algorithm[];
  fieldSlug: string | null;
  algorithmSlug: string | null;
  onPick: (slug: string) => void;
  onCount?: (count: number) => void;
}
