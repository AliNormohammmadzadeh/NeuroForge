import { describe, expect, it } from "vitest";

import { HEAD_PARTS, INTERFACES, interfaceBySlug } from "./catalog";

describe("interface catalog", () => {
  it("separates spike recordings from field recordings", () => {
    const neuralink = interfaceBySlug("threads");
    const synchron = interfaceBySlug("stent");
    const scalp = interfaceBySlug("eeg");
    expect(neuralink.example).toBe("Neuralink N1");
    expect(neuralink.hears.toLowerCase()).toContain("action potential");
    expect(neuralink.note.toLowerCase()).toContain("not a procedure");
    expect(synchron.sits.toLowerCase()).toContain("vein");
    expect(synchron.hears.toLowerCase()).toContain("field");
    expect(scalp.hears.toLowerCase()).toContain("does not survive");
    expect(new Set(INTERFACES.map((item) => item.slug)).size).toBe(INTERFACES.length);
    for (const item of [...HEAD_PARTS, ...INTERFACES]) {
      expect(item.steps.length).toBeGreaterThanOrEqual(3);
      expect(item.learn.sources.length).toBeGreaterThan(0);
      expect(item.learn.watchNote.length).toBeGreaterThan(20);
      for (const source of item.learn.sources) {
        expect(source.href.startsWith("https://")).toBe(true);
      }
      for (const step of item.steps) {
        expect(step.title.length).toBeGreaterThan(0);
        expect(step.body.length).toBeGreaterThan(40);
      }
    }
  });
});
