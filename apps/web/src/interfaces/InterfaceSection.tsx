import { matchesQuery } from "../content";
import { HEAD_PARTS, INTERFACES, headPartBySlug, interfaceBySlug } from "./catalog";

const CHAIN_LABELS = ["Source", "Sensor", "Signal", "Use"] as const;

function viewNote(focus: string): string {
  if (focus === "scalp") return "The scalp is forward. The electrode that stops here is scalp EEG.";
  if (focus === "skull") return "The scalp is faded so the bone is the part you can see.";
  if (focus === "cortex") return "Scalp and skull are faded. This is the surface the electrodes are aimed at.";
  return "The bright object is the electrode. Scalp, skull, and cortex stay in the drawing so you can see the depth.";
}

export function DeviceRail({
  focus,
  query,
  onSelect,
}: {
  focus: string;
  query: string;
  onSelect: (slug: string) => void;
}) {
  return (
    <aside className="rail">
      <p className="kicker">Work through the parts</p>
      <p className="lede">Select a part of the head, then an electrode. The card explains that part.</p>
      <p className="group-label">The head</p>
      <ul className="approaches">
        {HEAD_PARTS.map((item) => {
          const text = `${item.name} ${item.role} ${item.what} ${item.signal}`;
          return (
            <li key={item.slug} className={matchesQuery(text, query) ? "" : "is-hidden"}>
              <button type="button" aria-pressed={item.slug === focus} onClick={() => onSelect(item.slug)}>
                <i style={{ background: item.color }} />
                <span>
                  <strong>{item.name}</strong>
                  <em>{item.role}</em>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      <p className="group-label">The electrode</p>
      <ul className="approaches">
        {INTERFACES.map((item) => {
          const text = `${item.name} ${item.example} ${item.sits} ${item.hears}`;
          return (
            <li key={item.slug} className={matchesQuery(text, query) ? "" : "is-hidden"}>
              <button type="button" aria-pressed={item.slug === focus} onClick={() => onSelect(item.slug)}>
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
      <p className="rail-foot">Drag the open scene to turn it.</p>
    </aside>
  );
}

export function DeviceDetail({ focus }: { focus: string }) {
  const layer = headPartBySlug(focus);
  if (layer) {
    return (
      <aside className="detail">
        <article className="explain">
          <p className="kicker">{layer.role}</p>
          <h2>{layer.name}</h2>
          <p>{viewNote(focus)}</p>
          <dl className="facts">
            <div>
              <dt>What it is</dt>
              <dd>{layer.what}</dd>
            </div>
            <div>
              <dt>What the signal does</dt>
              <dd>{layer.signal}</dd>
            </div>
          </dl>
        </article>
      </aside>
    );
  }

  const current = interfaceBySlug(focus);
  return (
    <aside className="detail">
      <article className="explain">
        <p className="kicker">{current.layer}</p>
        <h2>
          {current.name}
          <span> {current.example}</span>
        </h2>
        <p>{viewNote(focus)}</p>
        <dl className="facts">
          <div>
            <dt>Where it sits</dt>
            <dd>{current.sits}</dd>
          </div>
          <div>
            <dt>What it hears</dt>
            <dd>{current.hears}</dd>
          </div>
        </dl>
        <ol className="chain">
          {current.chain.map((step, index) => (
            <li key={step}>
              <span>{CHAIN_LABELS[index]}</span>
              {step}
            </li>
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
    </aside>
  );
}
