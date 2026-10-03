import { lazy, Suspense, useEffect, useState } from "react";

import { loadAtlas } from "./api";
import { AtlasPage } from "./AtlasPage";
import { CortexBoundary } from "./cortex/CortexBoundary";
import type { AtlasData, CortexSelection } from "./types";

const CortexView = lazy(() =>
  import("./cortex/CortexView").then((module) => ({ default: module.CortexView })),
);

export function App() {
  const [data, setData] = useState<AtlasData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    loadAtlas((input, init) => fetch(input, { ...init, signal: controller.signal }))
      .then((atlas) => {
        if (!controller.signal.aborted) setData(atlas);
      })
      .catch((reason: unknown) => {
        if (controller.signal.aborted) return;
        setError(reason instanceof Error ? reason.message : "The atlas API did not answer.");
      });
    return () => controller.abort();
  }, []);

  if (error) {
    return (
      <main className="boot">
        <p className="mark">NeuroForge</p>
        <h1>The atlas API did not answer.</h1>
        <p className="lede">
          Start the registry, then reload. {error}
        </p>
        <code>uv run uvicorn api.main:app --port 8000</code>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="boot">
        <p className="mark">NeuroForge</p>
        <h1>Loading the atlas.</h1>
      </main>
    );
  }

  return (
    <AtlasPage
      data={data}
      renderCortex={(props: CortexSelection) => (
        <CortexBoundary
          fallback={
            <p className="hud">The cortex view did not start. The catalogs below still work.</p>
          }
        >
          <Suspense fallback={<p className="hud">Loading the cortex.</p>}>
            <CortexView {...props} />
          </Suspense>
        </CortexBoundary>
      )}
    />
  );
}
