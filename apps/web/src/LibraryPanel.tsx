import {
  LATER,
  ROADMAP,
  TRAIN_NEEDS,
  authorLine,
  matchesQuery,
  snapshotDate,
} from "./content";
import { LearnBlock } from "./LearnBits";
import type { Algorithm, AtlasData, Field, ModelCard, Paper, Resource } from "./types";

function hidden(text: string, query: string): string {
  return matchesQuery(text, query) ? "" : "is-hidden";
}

export function LibraryPanel({
  data,
  query,
  datasets,
  onPickAlgorithm,
  onOpenPart,
}: {
  data: AtlasData;
  query: string;
  datasets: Array<{ field: Field; resource: Resource }>;
  onPickAlgorithm: (slug: string) => void;
  onOpenPart: (slug: string) => void;
}) {
  return (
    <div className="library" id="library">
      <section id="start" className="band">
        <p className="kicker">Roadmap</p>
        <h2>Start here.</h2>
        <p className="lede">
          Five parts. Each part has smaller steps, a source list, and the scene it belongs to. Synthetic
          training comes before any download.
        </p>
        <ol className="steps">
          {ROADMAP.map((part) => {
            const blob = [
              part.title,
              part.aim,
              part.watchNote,
              part.video?.label,
              ...part.parts.map((item) => item.label),
              ...part.sources.map((source) => `${source.kind} ${source.label}`),
              ...part.steps.flatMap((step) => [step.title, step.body]),
            ].join(" ");
            return (
              <li key={part.title} className={hidden(blob, query)}>
                <div>
                  <h3>{part.title}</h3>
                  <p>{part.aim}</p>
                  {part.parts.length > 0 ? (
                    <div className="part-picks">
                      {part.parts.map((item) => (
                        <button key={item.slug} type="button" onClick={() => onOpenPart(item.slug)}>
                          Open {item.label}
                        </button>
                      ))}
                    </div>
                  ) : null}
                  <LearnBlock video={part.video} watchNote={part.watchNote} sources={part.sources} />
                  <ol className="substeps">
                    {part.steps.map((step) => (
                      <li
                        key={step.title}
                        className={hidden(`${part.title} ${part.aim} ${step.title} ${step.body}`, query)}
                      >
                        <div>
                          <h4>{step.title}</h4>
                          <p>{step.body}</p>
                        </div>
                      </li>
                    ))}
                  </ol>
                </div>
              </li>
            );
          })}
        </ol>
      </section>
      <section id="later" className="band">
        <p className="kicker">Not built yet</p>
        <h2>What we add later.</h2>
        <p className="lede">
          Improvements after the steps above. None of these run today. A benchmark card stays empty
          until a run in this repository reproduces the number.
        </p>
        <ol className="steps later">
          {LATER.map((item) => (
            <li key={item.title} className={hidden(`${item.group} ${item.title} ${item.body}`, query)}>
              <div>
                <p className="kicker">
                  <span className="badge">Later</span> {item.group}
                </p>
                <h3>{item.title}</h3>
                <p>{item.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>
      <section id="algorithms" className="band">
        <p className="kicker">Algorithms</p>
        <h2>What the labels mean.</h2>
        <div className="resources">
          {data.algorithms.map((item) => (
            <article
              key={item.slug}
              className={`resource algo ${hidden(`${item.name} ${item.summary} ${item.use_when} ${item.field}`, query)}`}
              onClick={(event) => {
                if ((event.target as HTMLElement).closest("a")) return;
                onPickAlgorithm(item.slug);
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
        <div className="datasets">
          {datasets.map(({ field, resource }) => (
            <DatasetLink key={resource.slug} field={field} resource={resource} query={query} />
          ))}
        </div>
      </section>
      <section id="train" className="band">
        <p className="kicker">What you need</p>
        <h2>Before a training run.</h2>
        <div className="resources">
          {TRAIN_NEEDS.map((need) => (
            <article key={need.title} className={`resource ${hidden(`${need.title} ${need.body}`, query)}`}>
              <h3>{need.title}</h3>
              <p>{need.body}</p>
            </article>
          ))}
        </div>
      </section>
      <section id="models" className="band">
        <p className="kicker">Recipes</p>
        <h2>Models that cannot leak the subject.</h2>
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
    </div>
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
    <a className={`dataset ${hidden(text, query)}`} href={resource.url} rel="noopener noreferrer">
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

export function AlgorithmCard({ algorithm }: { algorithm: Algorithm }) {
  return (
    <article className="algo-card">
      <p className="kicker">{algorithm.implemented ? "In this repository" : "Reference algorithm"}</p>
      <h2>{algorithm.name}</h2>
      <dl className="facts">
        <div>
          <dt>What it is</dt>
          <dd>{algorithm.summary}</dd>
        </div>
        <div>
          <dt>Use it when</dt>
          <dd>{algorithm.use_when}</dd>
        </div>
        <div>
          <dt>Trained here</dt>
          <dd>
            {algorithm.implemented
              ? "Yes. The command below is the one in this repository."
              : "No. The card explains it. The smoke trainer does not run it."}
          </dd>
        </div>
      </dl>
      {algorithm.command ? <code>{algorithm.command}</code> : null}
    </article>
  );
}
