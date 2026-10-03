import { useMemo, useState, type ReactNode } from "react";

import { CORTEX_FIELDS, DATA_KINDS, matchesQuery } from "./content";
import { DeviceDetail, DeviceRail } from "./interfaces/InterfaceSection";
import { AlgorithmCard, LibraryPanel } from "./LibraryPanel";
import type { AtlasData, CortexSelection } from "./types";

export interface AtlasPageProps {
  data: AtlasData;
  renderCortex: (props: CortexSelection) => ReactNode;
  renderCutaway: (slug: string) => ReactNode;
}

type Scene = "interfaces" | "atlas";

export function AtlasPage({ data, renderCortex, renderCutaway }: AtlasPageProps) {
  const [query, setQuery] = useState("");
  const [scene, setScene] = useState<Scene>("interfaces");
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [device, setDevice] = useState("threads");
  const [fieldSlug, setFieldSlug] = useState<string | null>(null);
  const [algorithmSlug, setAlgorithmSlug] = useState<string | null>(null);
  const [count, setCount] = useState(0);
  const selected = data.algorithms.find((item) => item.slug === algorithmSlug) ?? null;
  const cortexFields = data.fields.filter((field) =>
    (CORTEX_FIELDS as readonly string[]).includes(field.slug),
  );
  const datasets = useMemo(
    () =>
      data.fields.flatMap((field) =>
        field.resources
          .filter((resource) => DATA_KINDS.has(resource.kind))
          .map((resource) => ({ field, resource })),
      ),
    [data.fields],
  );
  const visibleAlgorithms = data.algorithms.filter(
    (item) =>
      (fieldSlug === null || item.field === fieldSlug) &&
      matchesQuery(`${item.name} ${item.summary} ${item.use_when} ${item.field}`, query),
  );

  function show(next: Scene) {
    setScene(next);
    setLibraryOpen(false);
  }

  function pickAlgorithm(slug: string) {
    setAlgorithmSlug((current) => (current === slug ? null : slug));
    setFieldSlug(null);
    setScene("atlas");
    setLibraryOpen(false);
  }

  function pickField(slug: string | null) {
    setFieldSlug(slug);
    setAlgorithmSlug(null);
  }

  return (
    <div className="app">
      <div className="viewport">
        {scene === "atlas"
          ? renderCortex({
              algorithms: data.algorithms,
              fieldSlug,
              algorithmSlug,
              onPick: pickAlgorithm,
              onCount: setCount,
            })
          : renderCutaway(device)}
      </div>
      <div className={libraryOpen ? "chrome library-open" : "chrome"}>
        <header className="top">
          <p className="mark">NeuroForge</p>
          <nav>
            <button type="button" aria-pressed={scene === "interfaces" && !libraryOpen} onClick={() => show("interfaces")}>
              Interfaces
            </button>
            <button type="button" aria-pressed={scene === "atlas" && !libraryOpen} onClick={() => show("atlas")}>
              Atlas
            </button>
            <button type="button" aria-pressed={libraryOpen} onClick={() => setLibraryOpen(true)}>
              Library
            </button>
          </nav>
          <label className="filter">
            <span>Filter</span>
            <input
              type="search"
              value={query}
              placeholder="CSP, DANDI, LFADS"
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
        </header>
        {libraryOpen ? (
          <LibraryPanel
            data={data}
            query={query}
            datasets={datasets}
            onPickAlgorithm={pickAlgorithm}
          />
        ) : scene === "interfaces" ? (
          <div className="dock">
            <DeviceRail slug={device} query={query} onSelect={setDevice} />
            <div className="dock-gap" />
            <DeviceDetail slug={device} />
          </div>
        ) : (
          <div className="dock">
            <aside className="rail">
              <p className="kicker">Field atlas</p>
              <p className="lede">
                Green is EEG, amber is spikes, blue is connectomes. The cloud is a map of the
                algorithms, not a scan.
              </p>
              <div className="tabs" role="group" aria-label="Field on the cortex">
                <button
                  type="button"
                  aria-pressed={fieldSlug === null && selected === null}
                  onClick={() => pickField(null)}
                >
                  All fields
                </button>
                {cortexFields.map((field) => (
                  <button
                    key={field.slug}
                    type="button"
                    aria-pressed={fieldSlug === field.slug}
                    onClick={() => pickField(field.slug)}
                  >
                    {field.name}
                  </button>
                ))}
              </div>
              <div className="pills" role="list">
                {visibleAlgorithms.map((item) => (
                  <button
                    key={item.slug}
                    type="button"
                    aria-pressed={algorithmSlug === item.slug}
                    onClick={() => pickAlgorithm(item.slug)}
                  >
                    {item.name}
                  </button>
                ))}
              </div>
            </aside>
            <div className="dock-gap" />
            <aside className="detail">
              {selected ? (
                <AlgorithmCard algorithm={selected} />
              ) : (
                <article className="explain">
                  <p className="kicker">Algorithm map</p>
                  <h2>The sources behind the recipes.</h2>
                  <p>
                    {count > 0
                      ? `${count} sites. Drag to orbit, then choose a name.`
                      : "Drag to orbit, then choose a name."}
                  </p>
                </article>
              )}
            </aside>
          </div>
        )}
        <ul className="legend scene-legend">
          {scene === "atlas" ? (
            <>
              <li>
                <i style={{ background: "#3ddc97" }} /> EEG
              </li>
              <li>
                <i style={{ background: "#e6a15c" }} /> Spikes
              </li>
              <li>
                <i style={{ background: "#7eb6ff" }} /> Connectomes
              </li>
            </>
          ) : (
            <>
              <li>
                <i style={{ background: "#e7c2b4" }} /> Scalp
              </li>
              <li>
                <i style={{ background: "#f4efe4" }} /> Skull
              </li>
              <li>
                <i style={{ background: "#d7b2a6" }} /> Cortex
              </li>
            </>
          )}
        </ul>
      </div>
    </div>
  );
}
