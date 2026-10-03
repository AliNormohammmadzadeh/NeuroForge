import { describe, expect, it } from "vitest";

import { loadAtlas } from "./api";
import { matchesQuery, snapshotDate } from "./content";

describe("loadAtlas", () => {
  it("reads fields, algorithms, and models from the registry", async () => {
    const payloads: Record<string, unknown> = {
      "/api/v1/fields": [{ slug: "eeg-bci" }],
      "/api/v1/algorithms": [{ slug: "csp" }],
      "/api/v1/models": [{ slug: "tcn" }],
    };
    const fetchImpl: typeof fetch = async (input) => {
      const path = String(input);
      return new Response(JSON.stringify(payloads[path]), { status: 200 });
    };
    const atlas = await loadAtlas(fetchImpl);
    expect(atlas.fields[0]?.slug).toBe("eeg-bci");
    expect(atlas.algorithms[0]?.slug).toBe("csp");
    expect(atlas.models[0]?.slug).toBe("tcn");
  });
});

describe("atlas text", () => {
  it("matches a filter only when the query is present", () => {
    expect(matchesQuery("MOABB motor imagery", "")).toBe(true);
    expect(matchesQuery("MOABB motor imagery", "moabb")).toBe(true);
    expect(matchesQuery("MOABB motor imagery", "dandi")).toBe(false);
  });

  it("formats the citation snapshot date", () => {
    expect(snapshotDate("2026-10-03")).toBe("3 Oct 2026");
  });
});
