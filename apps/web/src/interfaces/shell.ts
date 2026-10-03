export interface ShellMesh {
  positions: Float32Array;
  indices: Uint32Array;
}

export function buildHemisphere(widthSegments = 56, heightSegments = 40): ShellMesh {
  const positions: number[] = [];
  const indices: number[] = [];
  const columns = widthSegments + 1;

  for (let y = 0; y <= heightSegments; y += 1) {
    const theta = (y / heightSegments) * Math.PI;
    for (let x = 0; x <= widthSegments; x += 1) {
      const phi = (x / widthSegments) * Math.PI * 2;
      let px = Math.sin(theta) * Math.cos(phi);
      let py = Math.cos(theta);
      let pz = Math.sin(theta) * Math.sin(phi);
      const wrinkle = 0.045 * Math.sin(py * 11) * Math.cos(pz * 8) * Math.sin(theta);
      const side = px < 0 ? -1 : 1;
      px = Math.abs(px) * (0.8 + wrinkle) * side;
      py *= 1.02 + wrinkle;
      pz *= 0.84 + wrinkle * 0.45;
      positions.push(px, py, pz);
    }
  }

  for (let y = 0; y < heightSegments; y += 1) {
    for (let x = 0; x < widthSegments; x += 1) {
      const a = y * columns + x;
      const b = a + columns;
      indices.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }

  return {
    positions: Float32Array.from(positions),
    indices: Uint32Array.from(indices),
  };
}
