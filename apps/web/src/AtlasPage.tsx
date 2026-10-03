import { useMemo, useState, type ReactNode } from "react";

import { CORTEX_FIELDS, DATA_KINDS, matchesQuery } from "./content";
import { DeviceDetail, DeviceRail } from "./interfaces/InterfaceSection";
import { AlgorithmCard, LibraryPanel } from "./LibraryPanel";
import type { AtlasData, CortexSelection } from "./types";

export interface AtlasPageProps {
  data: AtlasData;
  renderCortex: (props: CortexSelection) => ReactNode;
  renderCutaway: (props: { focus: string; onPick: (id: string) => void }) => ReactNode;
}

type Scene = "interfaces" | "atlas";

export function AtlasPage({ data, renderCortex, renderCutaway }: AtlasPageProps) {
  const [query, setQuery] = useState("");
  const [scene, setScene] = useState<Scene>("interfaces");
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [focus, setFocus] = useState("threads");
  const [fieldSlug, setFieldSlug] = useState<string | null>(null);
  const [algorithmSlug, setAlgorithmSlug] = useState<string | null>(null);
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

  function openPart(slug: string) {
    if (slug === "atlas") {
      setScene("atlas");
      setLibraryOpen(false);
      setAlgorithmSlug(null);
      return;
    }
    setFocus(slug);
    setScene("interfaces");
    setLibraryOpen(false);
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
            })
          : renderCutaway({ focus, onPick: setFocus })}
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
            onOpenPart={openPart}
          />
        ) : scene === "interfaces" ? (
          <div className="dock">
            <DeviceRail focus={focus} query={query} onSelect={setFocus} />
            <div className="dock-gap" />
            <DeviceDetail focus={focus} />
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
              <p className="rail-foot">Drag the open cloud to turn it.</p>
            </aside>
            <div className="dock-gap" />
            <aside className="detail">
              {selected ? (
                <AlgorithmCard algorithm={selected} />
              ) : fieldSlug ? (
                <article className="explain">
                  <p className="kicker">This field</p>
                  <h2>{cortexFields.find((field) => field.slug === fieldSlug)?.name}</h2>
                  <p>{cortexFields.find((field) => field.slug === fieldSlug)?.summary}</p>
                  <p>Choose a name on the left. The card says what that algorithm is and when to use it.</p>
                </article>
              ) : (
                <article className="explain">
                  <p className="kicker">How to use the map</p>
                  <h2>Three kinds of signal.</h2>
                  <ol className="guide">
                    <li>
                      <strong>Pick a field.</strong> Green is EEG, amber is spikes, blue is connectomes.
                    </li>
                    <li>
                      <strong>Pick a name.</strong> The card says what it is and when to use it.
                    </li>
                    <li>
                      <strong>Open Library</strong> for the dataset, the train command, and the paper.
                    </li>
                  </ol>
                  <ul className="part-notes">
                    {cortexFields.map((field) => (
                      <li key={field.slug}>
                        <strong>{field.name}.</strong> {field.summary}
                      </li>
                    ))}
                  </ul>
                </article>
              )}
            </aside>
          </div>
        )}
      </div>
    </div>
  );
}
