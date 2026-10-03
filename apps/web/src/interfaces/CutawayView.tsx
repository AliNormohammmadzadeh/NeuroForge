import { OrbitControls } from "@react-three/drei";
import { Canvas, type ThreeEvent } from "@react-three/fiber";
import { useEffect, useMemo, type ReactNode } from "react";
import * as THREE from "three";

import { buildHemisphere } from "./shell";

interface Tone {
  color: string;
  transparent: boolean;
  opacity: number;
  emissive: string;
  emissiveIntensity: number;
  roughness: number;
  metalness: number;
}

function tone(color: string, active: boolean): Tone {
  return {
    color,
    transparent: true,
    opacity: active ? 1 : 0.22,
    emissive: active ? color : "#000000",
    emissiveIntensity: active ? 0.45 : 0,
    roughness: 0.42,
    metalness: 0.2,
  };
}

function useClip(): THREE.Plane[] {
  return useMemo(() => [new THREE.Plane(new THREE.Vector3(1, 0, 0), -0.06)], []);
}

function layerAlpha(id: "scalp" | "skull" | "cortex", focus: string): number {
  const order = ["scalp", "skull", "cortex"];
  const focusIndex = order.indexOf(focus);
  const self = order.indexOf(id);
  if (focusIndex === -1) {
    if (id === "scalp") return 0.18;
    if (id === "skull") return 0.34;
    return 1;
  }
  if (self === focusIndex) return id === "cortex" ? 1 : 0.78;
  if (self < focusIndex) return 0.04;
  return 0.22;
}

function Pickable({
  id,
  onPick,
  children,
}: {
  id: string;
  onPick: (id: string) => void;
  children: ReactNode;
}) {
  return (
    <group
      onClick={(event: ThreeEvent<MouseEvent>) => {
        event.stopPropagation();
        onPick(id);
      }}
      onPointerOver={(event: ThreeEvent<PointerEvent>) => {
        event.stopPropagation();
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        document.body.style.cursor = "";
      }}
    >
      {children}
    </group>
  );
}

function Cortex({ focus }: { focus: string }) {
  const clip = useClip();
  const geometry = useMemo(() => {
    const shell = buildHemisphere();
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(shell.positions, 3));
    geo.setIndex(new THREE.BufferAttribute(shell.indices, 1));
    geo.computeVertexNormals();
    return geo;
  }, []);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial
        color="#d7b2a6"
        emissive={focus === "cortex" ? "#e6a15c" : "#000000"}
        emissiveIntensity={focus === "cortex" ? 0.28 : 0}
        roughness={0.78}
        metalness={0}
        side={THREE.DoubleSide}
        clippingPlanes={clip}
      />
    </mesh>
  );
}

function Shell({
  radius,
  scale,
  color,
  opacity,
}: {
  radius: number;
  scale: [number, number, number];
  color: string;
  opacity: number;
}) {
  const clip = useClip();
  return (
    <mesh scale={scale}>
      <sphereGeometry args={[radius, 48, 32]} />
      <meshStandardMaterial
        color={color}
        transparent
        opacity={opacity}
        roughness={0.55}
        metalness={0}
        side={THREE.DoubleSide}
        clippingPlanes={clip}
        depthWrite={false}
      />
    </mesh>
  );
}

function NeedleBed({
  at,
  rows,
  cols,
  spacing,
  length,
  radius,
  color,
  active,
}: {
  at: [number, number, number];
  rows: number;
  cols: number;
  spacing: number;
  length: number;
  radius: number;
  color: string;
  active: boolean;
}) {
  const frame = useMemo(() => {
    const base = new THREE.Vector3(...at);
    const inward = base.clone().normalize().negate();
    const quaternion = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, -1, 0), inward);
    return { base, quaternion };
  }, [at]);
  const spots: Array<[number, number]> = [];
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      spots.push([(col - (cols - 1) / 2) * spacing, (row - (rows - 1) / 2) * spacing]);
    }
  }
  return (
    <group position={frame.base} quaternion={frame.quaternion}>
      {spots.map(([x, z]) => (
        <mesh key={`${x}:${z}`} position={[x, -length / 2, z]}>
          <cylinderGeometry args={[radius, radius * 0.35, length, 6]} />
          <meshStandardMaterial {...tone(color, active)} />
        </mesh>
      ))}
    </group>
  );
}

function Threads({ active }: { active: boolean }) {
  const layout = useMemo(() => {
    const anchor = new THREE.Vector3(0.62, 0.42, -0.18);
    const puck = anchor.clone().normalize().multiplyScalar(1.22);
    const curves = [-0.07, -0.03, 0.01, 0.05].map((offset, index) => {
      const tip = anchor
        .clone()
        .multiplyScalar(0.72)
        .add(new THREE.Vector3(offset, (index - 1.5) * 0.03, 0.02));
      return new THREE.CatmullRomCurve3([puck, anchor, tip]);
    });
    return { puck, curves };
  }, []);
  return (
    <group>
      <mesh position={layout.puck}>
        <sphereGeometry args={[0.07, 24, 16]} />
        <meshStandardMaterial {...tone("#f3efe6", active)} />
      </mesh>
      {layout.curves.map((curve, index) => (
        <mesh key={index}>
          <tubeGeometry args={[curve, 24, 0.008, 5, false]} />
          <meshStandardMaterial {...tone("#e6a15c", active)} />
        </mesh>
      ))}
    </group>
  );
}

function SurfaceFilm({ active }: { active: boolean }) {
  const spots: Array<[number, number]> = [];
  for (let row = 0; row < 3; row += 1) {
    for (let col = 0; col < 4; col += 1) {
      spots.push([(col - 1.5) * 0.07, (row - 1) * 0.06]);
    }
  }
  return (
    <group position={[0.78, 0.28, 0.32]} rotation={[0.4, 0.5, 0.2]}>
      {spots.map(([x, y]) => (
        <mesh key={`${x}:${y}`} position={[x, y, 0]}>
          <boxGeometry args={[0.045, 0.035, 0.008]} />
          <meshStandardMaterial {...tone("#e6c07a", active)} />
        </mesh>
      ))}
    </group>
  );
}

function Stent({ active }: { active: boolean }) {
  return (
    <group position={[0.34, 0.98, 0.02]} rotation={[0.2, 0, 1.15]}>
      <mesh>
        <cylinderGeometry args={[0.07, 0.07, 0.46, 16, 1, true]} />
        <meshStandardMaterial
          color="#8fd0c0"
          transparent
          opacity={active ? 0.28 : 0.08}
          roughness={0.3}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
      <mesh>
        <cylinderGeometry args={[0.045, 0.045, 0.4, 10, 1, true]} />
        <meshStandardMaterial {...tone("#d7fff4", active)} wireframe />
      </mesh>
    </group>
  );
}

function ScalpElectrodes({ active }: { active: boolean }) {
  const spots: Array<[number, number, number]> = [
    [0.72, 1.28, 0.12],
    [0.95, 1.12, 0.28],
    [0.58, 1.18, -0.16],
  ];
  return (
    <group>
      {spots.map((spot) => (
        <mesh key={spot.join(",")} position={spot}>
          <sphereGeometry args={[0.045, 16, 12]} />
          <meshStandardMaterial {...tone("#7eb6ff", active)} />
        </mesh>
      ))}
    </group>
  );
}

function Scene({ focus, onPick }: { focus: string; onPick: (id: string) => void }) {
  return (
    <>
      <Pickable id="scalp" onPick={onPick}>
        <Shell radius={1.42} scale={[1, 0.96, 0.9]} color="#e7c2b4" opacity={layerAlpha("scalp", focus)} />
      </Pickable>
      <Pickable id="skull" onPick={onPick}>
        <Shell radius={1.22} scale={[1, 0.98, 0.9]} color="#f4efe4" opacity={layerAlpha("skull", focus)} />
      </Pickable>
      <Pickable id="cortex" onPick={onPick}>
        <Cortex focus={focus} />
      </Pickable>
      <mesh position={[0.1, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
        <circleGeometry args={[0.7, 48]} />
        <meshStandardMaterial color="#6d403c" roughness={1} side={THREE.DoubleSide} />
      </mesh>
      <Pickable id="eeg" onPick={onPick}>
        <ScalpElectrodes active={focus === "eeg"} />
      </Pickable>
      <Pickable id="surface" onPick={onPick}>
        <SurfaceFilm active={focus === "surface"} />
      </Pickable>
      <Pickable id="stent" onPick={onPick}>
        <Stent active={focus === "stent"} />
      </Pickable>
      <Pickable id="utah" onPick={onPick}>
        <NeedleBed
          at={[0.7, 0.02, 0.38]}
          rows={4}
          cols={4}
          spacing={0.045}
          length={0.22}
          radius={0.012}
          color="#d5dbe3"
          active={focus === "utah"}
        />
      </Pickable>
      <Pickable id="threads" onPick={onPick}>
        <Threads active={focus === "threads"} />
      </Pickable>
      <Pickable id="connexus" onPick={onPick}>
        <NeedleBed
          at={[0.62, -0.42, 0.16]}
          rows={5}
          cols={3}
          spacing={0.028}
          length={0.2}
          radius={0.007}
          color="#c4b5ff"
          active={focus === "connexus"}
        />
      </Pickable>
    </>
  );
}

function useReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

export function CutawayView({
  focus,
  onPick,
}: {
  focus: string;
  onPick: (id: string) => void;
}) {
  const reduced = useReducedMotion();
  useEffect(() => () => {
    document.body.style.cursor = "";
  }, []);
  return (
    <Canvas
      aria-label="Schematic cutaway. Click a part, or choose one in the list."
      camera={{ position: [2.35, 0.72, 2.15], fov: 34, near: 0.1, far: 20 }}
      dpr={[1, 2]}
      frameloop={reduced ? "demand" : "always"}
      gl={{ antialias: true, localClippingEnabled: true, alpha: true }}
    >
      <ambientLight intensity={0.55} />
      <directionalLight position={[4, 3, 2]} intensity={1.6} />
      <directionalLight position={[-3, -1, -2]} intensity={0.45} color="#9eb6dd" />
      <Scene focus={focus} onPick={onPick} />
      <OrbitControls
        enablePan={false}
        autoRotate={!reduced}
        autoRotateSpeed={0.35}
        enableDamping
        minDistance={2.1}
        maxDistance={4.8}
        target={[0.15, 0.05, 0]}
      />
    </Canvas>
  );
}
