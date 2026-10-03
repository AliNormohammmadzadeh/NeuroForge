import { describe, expect, it } from "vitest";

import { buildCortex, nearestEdges } from "./geometry";

describe("buildCortex", () => {
  it("is a deterministic two-hemisphere cloud colored by the nearest algorithm", () => {
    const algorithms = [
      { field: "eeg-bci", anchor: [-0.4, 0.6, 0.1] as [number, number, number] },
      { field: "spikes", anchor: [0.4, -0.55, 0.05] as [number, number, number] },
      { field: "connectomics", anchor: [0.35, 0.05, 0.4] as [number, number, number] },
    ];
    const first = buildCortex(algorithms);
    const second = buildCortex(algorithms);
    expect(first.count).toBeGreaterThan(1000);
    expect(first.count).toBeLessThanOrEqual(1400);
    expect(Array.from(first.positions)).toEqual(Array.from(second.positions));
    expect(new Set(first.fields)).toEqual(new Set([0, 1, 2]));
    const nearest = Array.from(first.algos).filter((value) => value === 0).length;
    expect(nearest).toBeGreaterThan(0);
    const edges = nearestEdges(first);
    expect(edges.count).toBeGreaterThan(100);
    expect(edges.positions.length).toBe(edges.count * 3);
  });
});
