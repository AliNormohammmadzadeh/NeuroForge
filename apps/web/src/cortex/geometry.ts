export interface AlgorithmAnchor {
  field: string;
  anchor: [number, number, number];
}

export interface CortexCloud {
  positions: Float32Array;
  colors: Float32Array;
  fields: Float32Array;
  algos: Float32Array;
  count: number;
}

export interface CortexEdges {
  positions: Float32Array;
  colors: Float32Array;
  fields: Float32Array;
  algos: Float32Array;
  count: number;
}

const PALETTE: Array<[number, number, number]> = [
  [0.24, 0.86, 0.59],
  [0.9, 0.63, 0.36],
  [0.49, 0.71, 1],
];

export const FIELD_INDEX: Record<string, number> = {
  "eeg-bci": 0,
  spikes: 1,
  connectomics: 2,
};

function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hemispherePositions(): Float32Array {
  const rand = mulberry32(0x5a94);
  const positions: number[] = [];
  let guard = 0;
  while (positions.length / 3 < 1400 && guard < 20000) {
    guard += 1;
    let x = rand() * 2 - 1;
    let y = rand() * 2 - 1;
    let z = rand() * 2 - 1;
    const length = Math.hypot(x, y, z);
    if (length < 0.35 || length > 1) continue;
    x /= length;
    y /= length;
    z /= length;
    if (Math.abs(x) < 0.22) continue;
    const hemi = x < 0 ? -1 : 1;
    const wrinkle = 0.045 * Math.sin(y * 11) * Math.cos(z * 9);
    x = Math.abs(x) * (0.62 + wrinkle) * hemi;
    y *= 0.98 + wrinkle;
    z *= 0.72 + wrinkle * 0.5;
    positions.push(x, y, z);
  }
  return Float32Array.from(positions);
}

function colorFor(field: number, target: Float32Array, offset: number): void {
  const color = PALETTE[field] ?? PALETTE[2];
  target[offset] = color[0];
  target[offset + 1] = color[1];
  target[offset + 2] = color[2];
}

export function buildCortex(algorithms: AlgorithmAnchor[]): CortexCloud {
  const positions = hemispherePositions();
  const count = positions.length / 3;
  const colors = new Float32Array(count * 3);
  const fields = new Float32Array(count);
  const algos = new Float32Array(count);

  for (let i = 0; i < count; i += 1) {
    const x = positions[i * 3];
    const y = positions[i * 3 + 1];
    const z = positions[i * 3 + 2];
    let field = y > 0.15 ? 0 : y < -0.2 ? 1 : 2;
    let algo = field;
    if (algorithms.length > 0) {
      let best = 0;
      let bestDistance = Infinity;
      for (let k = 0; k < algorithms.length; k += 1) {
        const anchor = algorithms[k].anchor;
        const distance = (x - anchor[0]) ** 2 + (y - anchor[1]) ** 2 + (z - anchor[2]) ** 2;
        if (distance < bestDistance) {
          bestDistance = distance;
          best = k;
        }
      }
      algo = best;
      field = FIELD_INDEX[algorithms[best].field] ?? 2;
    }
    fields[i] = field;
    algos[i] = algo;
    colorFor(field, colors, i * 3);
  }

  return { positions, colors, fields, algos, count };
}

export function nearestEdges(cloud: CortexCloud): CortexEdges {
  const { positions, colors, fields, algos, count } = cloud;
  const lines: number[] = [];
  const lineColors: number[] = [];
  const lineFields: number[] = [];
  const lineAlgos: number[] = [];
  const step = Math.max(1, Math.floor(count / 220));
  for (let i = 0; i < count; i += step) {
    let best = -1;
    let bestDist = 0.2;
    const ax = positions[i * 3];
    const ay = positions[i * 3 + 1];
    const az = positions[i * 3 + 2];
    for (let j = 0; j < count; j += 3) {
      if (j === i) continue;
      const dx = ax - positions[j * 3];
      const dy = ay - positions[j * 3 + 1];
      const dz = az - positions[j * 3 + 2];
      const dist = dx * dx + dy * dy + dz * dz;
      if (dist < bestDist) {
        bestDist = dist;
        best = j;
      }
    }
    if (best < 0) continue;
    lines.push(ax, ay, az, positions[best * 3], positions[best * 3 + 1], positions[best * 3 + 2]);
    lineColors.push(
      colors[i * 3],
      colors[i * 3 + 1],
      colors[i * 3 + 2],
      colors[best * 3],
      colors[best * 3 + 1],
      colors[best * 3 + 2],
    );
    lineFields.push(fields[i], fields[best]);
    lineAlgos.push(algos[i], algos[best]);
  }
  return {
    positions: Float32Array.from(lines),
    colors: Float32Array.from(lineColors),
    fields: Float32Array.from(lineFields),
    algos: Float32Array.from(lineAlgos),
    count: lines.length / 3,
  };
}
