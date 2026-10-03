import { OrbitControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import * as THREE from "three";

import type { CortexSelection } from "../types";
import { FIELD_INDEX, buildCortex } from "./geometry";

const POINT_VS = `
attribute vec3 color;
attribute float aField;
attribute float aAlgo;
uniform float uField;
uniform float uAlgo;
uniform float uSize;
varying vec3 vColor;
varying float vAlpha;
void main() {
  vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  gl_Position = p;
  gl_PointSize = uSize * (8.0 / max(p.w, 0.8));
  float keep = 1.0;
  if (uAlgo > -0.5) {
    keep = abs(aAlgo - uAlgo) < 0.5 ? 1.0 : 0.08;
  } else if (uField > -0.5) {
    keep = abs(aField - uField) < 0.5 ? 1.0 : 0.12;
  }
  vColor = color;
  vAlpha = keep;
}
`;

const POINT_FS = `
precision mediump float;
varying vec3 vColor;
varying float vAlpha;
void main() {
  vec2 c = gl_PointCoord * 2.0 - 1.0;
  float d = dot(c, c);
  if (d > 1.0) discard;
  float rim = smoothstep(1.0, 0.2, d);
  gl_FragColor = vec4(vColor, rim * vAlpha);
}
`;

function useReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

function Cloud({
  algorithms,
  fieldSlug,
  algorithmSlug,
  onCount,
}: Omit<CortexSelection, "onPick">) {
  const cloud = useMemo(
    () => buildCortex(algorithms.map((item) => ({ field: item.field, anchor: item.anchor }))),
    [algorithms],
  );
  const material = useMemo(() => {
    const points = new THREE.ShaderMaterial({
      uniforms: {
        uField: { value: -1 },
        uAlgo: { value: -1 },
        uSize: { value: 6 },
      },
      vertexShader: POINT_VS,
      fragmentShader: POINT_FS,
      transparent: true,
      depthWrite: false,
    });
    points.toneMapped = false;
    return points;
  }, []);
  const field = fieldSlug != null && fieldSlug in FIELD_INDEX ? FIELD_INDEX[fieldSlug] : -1;
  const algo = algorithmSlug ? algorithms.findIndex((item) => item.slug === algorithmSlug) : -1;

  useEffect(() => {
    onCount?.(cloud.count);
  }, [cloud.count, onCount]);

  useEffect(() => {
    material.uniforms.uField.value = field;
    material.uniforms.uAlgo.value = algo;
  }, [algo, field, material]);

  useEffect(() => () => material.dispose(), [material]);

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[cloud.positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[cloud.colors, 3]} />
        <bufferAttribute attach="attributes-aField" args={[cloud.fields, 1]} />
        <bufferAttribute attach="attributes-aAlgo" args={[cloud.algos, 1]} />
      </bufferGeometry>
      <primitive object={material} attach="material" />
    </points>
  );
}

export function CortexView(props: CortexSelection) {
  const reduced = useReducedMotion();
  return (
    <Canvas
      aria-label="Stippled cortex. Green is EEG, amber is spikes, blue is connectomes."
      camera={{ position: [0.35, 0.15, 2.55], fov: 42, near: 0.1, far: 20 }}
      dpr={[1, 2]}
      frameloop={reduced ? "demand" : "always"}
      gl={{ alpha: true, antialias: true }}
    >
      <Cloud
        algorithms={props.algorithms}
        fieldSlug={props.fieldSlug}
        algorithmSlug={props.algorithmSlug}
        onCount={props.onCount}
      />
      <OrbitControls
        enablePan={false}
        autoRotate={!reduced}
        autoRotateSpeed={0.4}
        enableDamping
        minDistance={1.8}
        maxDistance={4.2}
        minPolarAngle={0.6}
        maxPolarAngle={2.1}
      />
    </Canvas>
  );
}
