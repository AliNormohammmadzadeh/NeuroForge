import { useMemo, useState, type ReactNode } from "react";

import {
  CORTEX_FIELDS,
  DATA_KINDS,
  ROADMAP,
  TRAIN_NEEDS,
  authorLine,
  matchesQuery,
  snapshotDate,
} from "./content";
import { InterfaceSection } from "./interfaces/InterfaceSection";
import type { Algorithm, AtlasData, CortexSelection, Field, ModelCard, Paper, Resource } from "./types";

export interface AtlasPageProps {
  data: AtlasData;
  renderCortex: (props: CortexSelection) => ReactNode;
  renderCutaway: (slug: string) => ReactNode;
}

function hidden(text: string, query: string): string {
  return matchesQuery(text, query) ? "" : "is-hidden";
}

export function AtlasPage({ data, renderCortex, renderCutaway }: AtlasPageProps) {
  const [query, setQuery] = useState("");
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

  function pickAlgorithm(slug: string) {
    setAlgorithmSlug((current) => (current === slug ? null : slug));
    setFieldSlug(null);
  }

  function pickField(slug: string | null) {
    setFieldSlug(slug);
    setAlgorithmSlug(null);
    const section = slug ? document.getElementById(slug) : null;
    if (section && typeof section.scrollIntoView === "function") {
      section.scrollIntoView();
    }
  }

  return (
    <>
      <a className="skip" href="#start">
        Skip the cortex view
      </a>
      <header className="top">
        <p className="mark">NeuroForge</p>
        <nav>
          <a href="#interfaces">Interfaces</a>
          <a href="#start">Start</a>
          <a href="#algorithms">Algorithms</a>
          <a href="#datasets">Datasets</a>
          <a href="#train">Train</a>
          <a href="#models">Models</a>
          <a href="#fields">Fields</a>
        </nav>
      </header>
      <InterfaceSection query={query} renderCutaway={renderCutaway} />
      <section id="map" className="hero map">
        <div>
          <p className="kicker">Field atlas</p>
          <h2>The sources behind the recipes.</h2>
          <p className="lede">
            The cloud is a map of the algorithms, not a scan. Green holds the EEG decoders, amber
            the spike models, blue the connectome models. Choose a name to read when to use it.
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
          <label className="algo-pick">
            <span>Algorithm on the cortex</span>
            <select
              aria-label="Algorithm on the cortex"
              value={algorithmSlug ?? ""}
              onChange={(event) => {
                const slug = event.target.value;
                if (!slug) {
                  setAlgorithmSlug(null);
                  setFieldSlug(null);
                  return;
                }
                setAlgorithmSlug(slug);
                setFieldSlug(null);
              }}
            >
              <option value="">All algorithms</option>
              {data.algorithms.map((item) => (
                <option key={item.slug} value={item.slug}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
          <label className="filter">
            <span>Filter the atlas</span>
            <input
              type="search"
              value={query}
              placeholder="CSP, DANDI, LFADS"
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
        </div>
        <div className="stack">
        <div className="stage">
          <ul className="legend">
            <li>
              <i style={{ background: "#3ddc97" }} />
              EEG
            </li>
            <li>
              <i style={{ background: "#e6a15c" }} />
              Spikes
            </li>
            <li>
              <i style={{ background: "#7eb6ff" }} />
              Connectomes
            </li>
          </ul>
          {renderCortex({
            algorithms: data.algorithms,
            fieldSlug,
            algorithmSlug,
            onPick: pickAlgorithm,
            onCount: setCount,
          })}
          <p className="hud">
            {count > 0
              ? `${count} sites. Drag to orbit. Choose an algorithm below.`
              : "Drag to orbit. Choose an algorithm below."}
          </p>
        </div>
        <div className="pills" role="list">
          {data.algorithms
            .filter((item) => fieldSlug === null || item.field === fieldSlug)
            .map((item) => (
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
        {selected ? <AlgorithmCard algorithm={selected} /> : null}
        </div>
      </section>
      <section id="start" className="band">
        <p className="kicker">Roadmap</p>
        <h2>Start here.</h2>
        <p className="lede">
          Eight steps from a newcomer to a first decoder. Synthetic training comes before any
          download.
        </p>
        <ol className="steps">
          {ROADMAP.map((step) => (
            <li key={step.title} className={hidden(`${step.title} ${step.body}`, query)}>
              <h3>{step.title}</h3>
              <p>{step.body}</p>
            </li>
          ))}
        </ol>
      </section>
      <section id="algorithms" className="band">
        <p className="kicker">Algorithms</p>
        <h2>What the labels mean.</h2>
        <p className="lede">
          The same names sit on the cortex. A reference algorithm is explained here and is not
          trained by the smoke command.
        </p>
        <div className="resources">
          {data.algorithms.map((item) => (
            <article
              key={item.slug}
              className={`resource algo ${hidden(`${item.name} ${item.summary} ${item.use_when} ${item.field}`, query)}`}
              onClick={(event) => {
                if ((event.target as HTMLElement).closest("a")) return;
                pickAlgorithm(item.slug);
              }}
            >
              <p className="kicker">
                {item.implemented ? "In this repository" : "Reference, not trained here"}
              </p>
              <h3>
                <a href={item.url} rel="noopener noreferrer">
                  {item.name}
                </a>
              </h3>
              <p>{item.summary}</p>
              <p>{item.use_when}</p>
              {item.command ? <code>{item.command}</code> : null}
            </article>
          ))}
        </div>
      </section>
      <section id="datasets" className="band">
        <p className="kicker">Datasets</p>
        <h2>Where the recordings live.</h2>
        <p className="lede">
          Public archives and benchmarks. Open the link, then keep the files local. This site does
          not download them for you.
        </p>
        <div className="datasets">
          {datasets.map(({ field, resource }) => (
            <DatasetLink key={resource.slug} field={field} resource={resource} query={query} />
          ))}
        </div>
      </section>
      <section id="train" className="band">
        <p className="kicker">What you need</p>
        <h2>Before a training run.</h2>
        <p className="lede">
          The trainer is small on purpose. These are the pieces that have to exist or the number
          will not mean anything.
        </p>
        <div className="resources">
          {TRAIN_NEEDS.map((need) => (
            <article
              key={need.title}
              className={`resource ${hidden(`${need.title} ${need.body}`, query)}`}
            >
              <h3>{need.title}</h3>
              <p>{need.body}</p>
            </article>
          ))}
        </div>
      </section>
      <section id="models" className="band">
        <p className="kicker">Recipes</p>
        <h2>Models that cannot leak the subject.</h2>
        <p className="lede">
          Four models ship with a train command. Each card says what tensor goes in and when to
          choose it. Published competition numbers are not filled in.
        </p>
        <div className="grid">
          {data.models.map((model) => (
            <ModelArticle key={model.slug} model={model} query={query} />
          ))}
        </div>
      </section>
      <main id="fields">
        {data.fields.map((field) => (
          <FieldSection key={field.slug} field={field} query={query} />
        ))}
      </main>
      <footer>
        <p>
          Paper metadata was read from OpenAlex and arXiv on 3 Oct 2026. Citation counts are that
          snapshot. Full text is not stored.
        </p>
      </footer>
    </>
  );
}

function AlgorithmCard({ algorithm }: { algorithm: Algorithm }) {
  return (
    <article className="algo-card">
      <p className="kicker">{algorithm.implemented ? "In this repository" : "Reference algorithm"}</p>
      <h2>{algorithm.name}</h2>
      <p>{algorithm.summary}</p>
      <p>{algorithm.use_when}</p>
      {algorithm.command ? <code>{algorithm.command}</code> : null}
    </article>
  );
}

function DatasetLink({
  field,
  resource,
  query,
}: {
  field: Field;
  resource: Resource;
  query: string;
}) {
  const text = `${resource.name} ${resource.summary} ${field.name} ${resource.kind}`;
  return (
    <a
      className={`dataset ${hidden(text, query)}`}
      href={resource.url}
      rel="noopener noreferrer"
    >
      <p className="kicker">
        {field.name} · {resource.kind}
      </p>
      <h3>{resource.name}</h3>
      <p>{resource.summary}</p>
      <p className="access">{resource.access}</p>
    </a>
  );
}

function ModelArticle({ model, query }: { model: ModelCard; query: string }) {
  const text = `${model.name} ${model.summary} ${model.usage} ${model.modalities.join(" ")}`;
  return (
    <article className={`card ${hidden(text, query)}`}>
      <p className="kicker">{model.modalities.join(" · ")}</p>
      <h3>{model.name}</h3>
      <p>{model.summary}</p>
      <p>
        <strong>Input.</strong> {model.inputs}
      </p>
      <p>
        <strong>Use it when.</strong> {model.usage}
      </p>
      <code>{model.train_command}</code>
    </article>
  );
}

function FieldSection({ field, query }: { field: Field; query: string }) {
  return (
    <section className="field" id={field.slug} style={{ ["--hue" as string]: field.hue }}>
      <p className="kicker">{field.kicker}</p>
      <h2>{field.name}</h2>
      <p className="essay">{field.summary}</p>
      <div className="resources">
        {field.resources.map((resource) => (
          <article
            key={resource.slug}
            className={`resource ${hidden(`${resource.name} ${resource.summary} ${resource.access} ${resource.kind}`, query)}`}
          >
            <p className="kicker">{resource.kind}</p>
            <h3>
              <a href={resource.url} rel="noopener noreferrer">
                {resource.name}
              </a>
            </h3>
            <p>{resource.summary}</p>
            <p className="access">{resource.access}</p>
          </article>
        ))}
      </div>
      {field.papers.length > 0 ? (
        <>
          <h3 className="papers-label">Papers this field is named after</h3>
          <ol className="papers">
            {field.papers.map((paper) => (
              <PaperItem key={paper.url} paper={paper} field={field} query={query} />
            ))}
          </ol>
        </>
      ) : null}
    </section>
  );
}

function PaperItem({ paper, field, query }: { paper: Paper; field: Field; query: string }) {
  const text = `${paper.title} ${paper.venue} ${paper.authors.join(" ")} ${paper.why}`;
  return (
    <li className={`paper ${hidden(text, query)}`}>
      <p className="kicker">
        {paper.year} · {paper.venue}
      </p>
      <h3>
        <a href={paper.url} rel="noopener noreferrer">
          {paper.title}
        </a>
      </h3>
      <p className="by">{authorLine(paper.authors)}</p>
      <p>{paper.why}</p>
      {paper.cited_by_count != null ? (
        <p className="count">
          {paper.cited_by_count.toLocaleString("en-US")} citations in OpenAlex on{" "}
          {snapshotDate(field.retrieved_on)}. A snapshot, not a ranking.
        </p>
      ) : null}
    </li>
  );
}
