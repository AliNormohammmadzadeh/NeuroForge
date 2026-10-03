import type { Algorithm, AtlasData, Field, ModelCard } from "./types";

async function getJson<T>(path: string, fetchImpl: typeof fetch): Promise<T> {
  const response = await fetchImpl(path);
  if (!response.ok) {
    throw new Error(`${path} returned ${response.status}`);
  }
  return (await response.json()) as T;
}

export async function loadAtlas(fetchImpl: typeof fetch = fetch): Promise<AtlasData> {
  const [fields, algorithms, models] = await Promise.all([
    getJson<Field[]>("/api/v1/fields", fetchImpl),
    getJson<Algorithm[]>("/api/v1/algorithms", fetchImpl),
    getJson<ModelCard[]>("/api/v1/models", fetchImpl),
  ]);
  return { fields, algorithms, models };
}
