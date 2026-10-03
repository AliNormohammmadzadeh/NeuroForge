import { useState, type ReactNode } from "react";

import { matchesQuery } from "../content";
import { INTERFACES, interfaceBySlug } from "./catalog";

export function InterfaceSection({
  query,
  renderCutaway,
}: {
  query: string;
  renderCutaway: (slug: string) => ReactNode;
}) {
  const [slug, setSlug] = useState("threads");
  const current = interfaceBySlug(slug);

  return (
    <section id="interfaces" className="hero interfaces">
      <div>
        <p className="kicker">How a recording is made</p>
        <h1>The electrode decides what the model can hear.</h1>
        <p className="lede">
          Closer to the neuron, the voltage is larger and the picture is sharper. Further away, it
          is easier to place and the picture is blurrier. The drawing is a schematic, not a scan
          and not a surgical plan.
        </p>
        <ul className="approaches">
          {INTERFACES.map((item) => {
            const text = `${item.name} ${item.example} ${item.sits} ${item.hears}`;
            const hidden = matchesQuery(text, query) ? "" : "is-hidden";
            return (
              <li key={item.slug} className={hidden}>
                <button
                  type="button"
                  aria-pressed={item.slug === slug}
                  onClick={() => setSlug(item.slug)}
                >
                  <i style={{ background: item.color }} />
                  <span>
                    <strong>{item.name}</strong>
                    <em>{item.example}</em>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
      <div className="stack">
        <div className="stage cutaway">
          <ul className="legend">
            <li>
              <i style={{ background: "#e7c2b4" }} />
              Scalp
            </li>
            <li>
              <i style={{ background: "#f4efe4" }} />
              Skull
            </li>
            <li>
              <i style={{ background: "#d7b2a6" }} />
              Cortex
            </li>
          </ul>
          {renderCutaway(slug)}
          <p className="hud">Drag to orbit. The bright device is the one selected.</p>
        </div>
        <article className="explain">
          <p className="kicker">{current.layer}</p>
          <h2>
            {current.name}
            <span> {current.example}</span>
          </h2>
          <p>{current.sits}</p>
          <p>{current.hears}</p>
          <ol className="chain">
            {current.chain.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
          <p>{current.note}</p>
          <p className="access">
            <a href={current.url} rel="noopener noreferrer">
              {current.linkLabel}
            </a>
            <span> · {current.status}</span>
          </p>
        </article>
      </div>
    </section>
  );
}
