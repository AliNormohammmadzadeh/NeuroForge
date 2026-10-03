import { matchesQuery } from "../content";
import { INTERFACES, interfaceBySlug } from "./catalog";

export function DeviceRail({
  slug,
  query,
  onSelect,
}: {
  slug: string;
  query: string;
  onSelect: (slug: string) => void;
}) {
  return (
    <aside className="rail">
      <p className="kicker">How a recording is made</p>
      <p className="lede">
        Closer to the neuron, the voltage is larger. Further away, it is easier to place. The scene
        is a schematic, not a scan and not a surgical plan.
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
                onClick={() => onSelect(item.slug)}
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
    </aside>
  );
}

export function DeviceDetail({ slug }: { slug: string }) {
  const current = interfaceBySlug(slug);
  return (
    <aside className="detail">
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
    </aside>
  );
}
