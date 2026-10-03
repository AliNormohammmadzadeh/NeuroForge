import { Html, OrbitControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import * as THREE from "three";

import type { CortexSelection } from "../types";
import { FIELD_INDEX, buildCortex, nearestEdges } from "./geometry";

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
  gl_PointSize = uSize / max(p.w, 0.25);
  float keep = 1.0;
  if (uAlgo > -0.5) {
    keep = abs(aAlgo - uAlgo) < 0.5 ? 1.0 : 0.12;
  } else if (uField > -0.5) {
    keep = abs(aField - uField) < 0.5 ? 1.0 : 0.16;
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
  float rim = smoothstep(1.0, 0.15, d);
  gl_FragColor = vec4(vColor, rim * vAlpha);
}
`;

const LINE_VS = `
attribute vec3 color;
attribute float aField;
attribute float aAlgo;
uniform float uField;
uniform float uAlgo;
varying vec3 vColor;
varying float vAlpha;
void main() {
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  float keep = 0.35;
  if (uAlgo > -0.5) {
    keep = abs(aAlgo - uAlgo) < 0.5 ? 0.55 : 0.04;
  } else if (uField > -0.5) {
    keep = abs(aField - uField) < 0.5 ? 0.45 : 0.05;
  }
  vColor = color;
  vAlpha = keep;
}
`;

const LINE_FS = `
precision mediump float;
varying vec3 vColor;
varying float vAlpha;
void main() {
  gl_FragColor = vec4(vColor, vAlpha);
}
`;

function shader(vertex: string, fragment: string): THREE.ShaderMaterial {
  const material = new THREE.ShaderMaterial({
    uniforms: {
      uField: { value: -1 },
      uAlgo: { value: -1 },
      uSize: { value: 28 },
    },
    vertexShader: vertex,
    fragmentShader: fragment,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  material.toneMapped = false;
  return material;
}

function Cloud({
  algorithms,
  fieldSlug,
  algorithmSlug,
  onPick,
  onCount,
}: CortexSelection) {
  const cloud = useMemo(
    () => buildCortex(algorithms.map((item) => ({ field: item.field, anchor: item.anchor }))),
    [algorithms],
  );
  const edges = useMemo(() => nearestEdges(cloud), [cloud]);
  const pointsMaterial = useMemo(() => shader(POINT_VS, POINT_FS), []);
  const linesMaterial = useMemo(() => shader(LINE_VS, LINE_FS), []);
  const field = fieldSlug != null && fieldSlug in FIELD_INDEX ? FIELD_INDEX[fieldSlug] : -1;
  const algo = algorithmSlug
    ? algorithms.findIndex((item) => item.slug === algorithmSlug)
    : -1;

  useEffect(() => {
    onCount?.(cloud.count);
  }, [cloud.count, onCount]);

  useEffect(() => {
    pointsMaterial.uniforms.uField.value = field;
    pointsMaterial.uniforms.uAlgo.value = algo;
    linesMaterial.uniforms.uField.value = field;
    linesMaterial.uniforms.uAlgo.value = algo;
  }, [algo, field, linesMaterial, pointsMaterial]);

  useEffect(
    () => () => {
      pointsMaterial.dispose();
      linesMaterial.dispose();
    },
    [linesMaterial, pointsMaterial],
  );

  return (
    <>
      <lineSegments>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[edges.positions, 3]} />
          <bufferAttribute attach="attributes-color" args={[edges.colors, 3]} />
          <bufferAttribute attach="attributes-aField" args={[edges.fields, 1]} />
          <bufferAttribute attach="attributes-aAlgo" args={[edges.algos, 1]} />
        </bufferGeometry>
        <primitive object={linesMaterial} attach="material" />
      </lineSegments>
      <points>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[cloud.positions, 3]} />
          <bufferAttribute attach="attributes-color" args={[cloud.colors, 3]} />
          <bufferAttribute attach="attributes-aField" args={[cloud.fields, 1]} />
          <bufferAttribute attach="attributes-aAlgo" args={[cloud.algos, 1]} />
        </bufferGeometry>
        <primitive object={pointsMaterial} attach="material" />
      </points>
      {algorithms.map((item) => (
        <Html key={item.slug} position={item.anchor} center zIndexRange={[20, 0]}>
          <button
            type="button"
            className="algo-label"
            aria-pressed={algorithmSlug === item.slug}
            onPointerDown={(event) => event.stopPropagation()}
            onClick={() => onPick(item.slug)}
          >
            {item.name}
          </button>
        </Html>
      ))}
    </>
  );
}

function useReducedMotion(): boolean {
  const reduced =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  return reduced;
}

export function CortexView(props: CortexSelection) {
  const reduced = useReducedMotion();
  return (
    <Canvas
      aria-label="Rotating point cloud. Algorithm labels sit on the EEG, spike, and connectome clusters."
      camera={{ position: [0.35, 0.2, 2.7], fov: 45, near: 0.1, far: 20 }}
      dpr={[1, 2]}
      frameloop={reduced ? "demand" : "always"}
      gl={{ alpha: true, antialias: true }}
    >
      <Cloud {...props} />
      <OrbitControls
        enablePan={false}
        autoRotate={!reduced}
        autoRotateSpeed={0.55}
        enableDamping
        minDistance={1.7}
        maxDistance={4.6}
        minPolarAngle={0.45}
        maxPolarAngle={2.2}
      />
    </Canvas>
  );
}
