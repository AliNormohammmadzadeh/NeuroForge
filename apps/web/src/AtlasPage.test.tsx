import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AtlasPage } from "./AtlasPage";
import type { AtlasData } from "./types";

const data: AtlasData = {
  fields: [
    {
      slug: "eeg-bci",
      name: "EEG and motor imagery",
      kicker: "Field 01",
      hue: "#3ddc97",
      summary: "Scalp EEG leaks if a window crosses the split.",
      retrieved_on: "2026-10-03",
      snapshot_source: "OpenAlex and arXiv",
      resources: [
        {
          slug: "moabb",
          name: "MOABB",
          kind: "benchmark",
          url: "https://moabb.neurotechx.com/docs/index.html",
          access: "pip install moabb",
          summary: "Mother of All BCI Benchmarks.",
        },
      ],
      papers: [
        {
          title: "EEGNet: a compact convolutional neural network",
          year: 2018,
          authors: ["Lawhern", "Solon", "Waytowich", "Gordon"],
          venue: "J. Neural Eng.",
          url: "https://doi.org/10.1088/1741-2552/aace8c",
          why: "The compact EEG baseline.",
          cited_by_count: 1200,
        },
      ],
    },
  ],
  algorithms: [
    {
      slug: "csp",
      name: "CSP",
      field: "eeg-bci",
      implemented: false,
      anchor: [-0.2, 0.78, 0.02],
      summary: "Common Spatial Patterns.",
      use_when: "Use it as the classical baseline.",
      url: "https://doi.org/10.3389/fnins.2012.00039",
      command: "",
    },
  ],
  models: [
    {
      slug: "tcn",
      name: "Causal TCN",
      architecture: "dilated",
      task: "classification",
      modalities: ["EEG"],
      param_count: 12,
      summary: "Stacked dilated causal convolutions.",
      train_command: "uv run neuroforge train --model tcn --steps 2",
      inputs: "A batch of shape (trials, channels, samples).",
      usage: "Use it when latency matters.",
      license: "Apache-2.0",
      benchmarks: [],
    },
  ],
};

function renderAtlas() {
  return render(
    <AtlasPage
      data={data}
      renderCortex={() => <div aria-label="cortex stub" />}
      renderCutaway={() => <div aria-label="cutaway stub" />}
    />,
  );
}

function datasetLink(): HTMLElement {
  const link = screen.getAllByRole("link").find((item) => {
    return (
      item.getAttribute("href") === "https://moabb.neurotechx.com/docs/index.html" &&
      item.classList.contains("dataset")
    );
  });
  if (!link) throw new Error("missing dataset link");
  return link;
}

describe("AtlasPage", () => {
  it("shows the roadmap, a dataset link, and the model usage note", () => {
    renderAtlas();
    expect(screen.getByRole("heading", { name: /Flexible threads/ })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Neuralink" })).toHaveAttribute(
      "href",
      "https://neuralink.com/technology/",
    );
    expect(screen.getByText(/not a procedure/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Skull/ }));
    expect(screen.getByRole("heading", { name: "Skull" })).toBeInTheDocument();
    expect(screen.getByText(/faded so the bone is the part you can see/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Library" }));
    expect(screen.getByRole("heading", { name: "Start here." })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "What we add later." })).toBeInTheDocument();
    expect(screen.getByText("Train on a local BIDS recording")).toBeInTheDocument();
    expect(screen.getAllByText("Later").length).toBeGreaterThan(0);
    expect(screen.getAllByText(/neuroforge demo/).length).toBeGreaterThan(0);
    expect(datasetLink()).toHaveAttribute("href", "https://moabb.neurotechx.com/docs/index.html");
    expect(screen.getByText(/Use it when latency matters/)).toBeInTheDocument();
    expect(screen.getByText(/Lawhern, Solon, Waytowich et al./)).toBeInTheDocument();
    expect(screen.getByText(/1,200 citations in OpenAlex on 3 Oct 2026/)).toBeInTheDocument();
  });

  it("filters cards and selects an algorithm without leaving the page", () => {
    renderAtlas();
    fireEvent.click(screen.getByRole("button", { name: /Endovascular stent/ }));
    expect(screen.getByText(/superior sagittal sinus/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Library" }));
    fireEvent.change(screen.getByPlaceholderText("CSP, DANDI, LFADS"), {
      target: { value: "latency" },
    });
    expect(screen.getByRole("heading", { name: "Causal TCN" })).not.toHaveClass("is-hidden");
    expect(datasetLink()).toHaveClass("is-hidden");
    fireEvent.change(screen.getByPlaceholderText("CSP, DANDI, LFADS"), {
      target: { value: "" },
    });
    fireEvent.click(screen.getByText("Common Spatial Patterns."));
    expect(screen.getByText("Reference algorithm")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "EEG and motor imagery" }));
    expect(screen.getByRole("button", { name: "EEG and motor imagery" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.queryByText("Reference algorithm")).not.toBeInTheDocument();
  });
});
