import type { LearnLink } from "./learn";

const KIND_LABEL = {
  video: "Video",
  paper: "Paper",
  page: "Page",
  data: "Data",
} as const;

export function SourceList({ links }: { links: readonly LearnLink[] }) {
  if (links.length === 0) return null;
  return (
    <>
      <p className="kicker">Sources</p>
      <ul className="sources">
        {links.map((link) => (
          <li key={`${link.kind}-${link.href}`}>
            <a href={link.href} rel="noopener noreferrer" target="_blank">
              <span className="kind">{KIND_LABEL[link.kind]}</span>
              {link.label}
            </a>
          </li>
        ))}
      </ul>
    </>
  );
}

export function LearnBlock({
  video,
  watchNote,
  sources,
}: {
  video?: LearnLink;
  watchNote?: string;
  sources: readonly LearnLink[];
}) {
  return (
    <div className="learn">
      {video?.embed ? (
        <iframe
          className="watch"
          title={video.label}
          src={`https://www.youtube-nocookie.com/embed/${video.embed}`}
          loading="lazy"
          allow="fullscreen; picture-in-picture"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
        />
      ) : null}
      {watchNote ? <p>{watchNote}</p> : null}
      <SourceList links={sources} />
    </div>
  );
}
