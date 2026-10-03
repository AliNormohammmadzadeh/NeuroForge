import { describe, expect, it } from "vitest";

import { buildHemisphere } from "./shell";

describe("buildHemisphere", () => {
  it("builds a closed wrinkled shell with both sides", () => {
    const shell = buildHemisphere(8, 6);
    expect(shell.positions.length).toBe((8 + 1) * (6 + 1) * 3);
    expect(shell.indices.length).toBe(8 * 6 * 6);
    let left = 0;
    let right = 0;
    for (let i = 0; i < shell.positions.length; i += 3) {
      if (shell.positions[i] < 0) left += 1;
      if (shell.positions[i] > 0) right += 1;
    }
    expect(left).toBeGreaterThan(0);
    expect(right).toBeGreaterThan(0);
  });
});
