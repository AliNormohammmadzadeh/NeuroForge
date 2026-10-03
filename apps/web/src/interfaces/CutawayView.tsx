import { useGLTF, OrbitControls } from "@react-three/drei";
import { Canvas, type ThreeEvent } from "@react-three/fiber";
import { useEffect, useMemo, type ReactNode } from "react";
import * as THREE from "three";

import cortexUrl from "./cortex.glb?url";

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
    if (id === "scalp") return 0.06;
    if (id === "skull") return 0.1;
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

function tissue(color: string, focus: string, part: string) {
  const selected = focus === part;
  const dim = focus === "scalp" || focus === "skull";
  return {
    color,
    roughness: 0.58,
    metalness: 0,
    sheen: 1,
    sheenRoughness: 0.42,
    sheenColor: "#f3e4dc",
    emissive: selected ? "#6a4038" : "#000000",
    emissiveIntensity: selected ? 0.22 : 0,
    transparent: dim,
    opacity: dim ? 0.28 : 1,
  };
}

function Brain({ focus }: { focus: string }) {
  const gltf = useGLTF(cortexUrl);
  const cortex = gltf.nodes.cortex as THREE.Mesh;
  const cerebellum = gltf.nodes.cerebellum as THREE.Mesh;
  const brainstem = gltf.nodes.brainstem as THREE.Mesh;
  return (
    <group>
      <mesh geometry={cortex.geometry}>
        <meshPhysicalMaterial {...tissue("#c9a094", focus, "cortex")} />
      </mesh>
      <mesh geometry={cerebellum.geometry}>
        <meshPhysicalMaterial {...tissue("#b88884", focus, "cortex")} />
      </mesh>
      <mesh geometry={brainstem.geometry}>
        <meshPhysicalMaterial {...tissue("#b79a90", focus, "cortex")} />
      </mesh>
    </group>
  );
}

useGLTF.preload(cortexUrl);

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
    const anchor = new THREE.Vector3(0.5, 0.32, -0.16);
    const puck = anchor.clone().normalize().multiplyScalar(anchor.length() + 0.16);
    const inward = anchor.clone().normalize();
    const curves = [-0.05, -0.02, 0.01, 0.04].map((offset, index) => {
      const tip = anchor.clone().addScaledVector(inward, -0.16).add(new THREE.Vector3(0, offset, (index - 1.5) * 0.02));
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
    <group position={[0.55, 0.22, 0.08]} rotation={[0.15, 1.15, 0.2]}>
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
    <group position={[0.02, 0.66, -0.08]} rotation={[Math.PI / 2, 0, 0]}>
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
    [0.18, 0.9, 0.2],
    [0.42, 0.82, 0.42],
    [0.08, 0.88, -0.22],
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
        <Shell radius={1} scale={[0.86, 0.82, 1.05]} color="#e7c2b4" opacity={layerAlpha("scalp", focus)} />
      </Pickable>
      <Pickable id="skull" onPick={onPick}>
        <Shell radius={1} scale={[0.76, 0.74, 0.96]} color="#f4efe4" opacity={layerAlpha("skull", focus)} />
      </Pickable>
      <Pickable id="cortex" onPick={onPick}>
        <Brain focus={focus} />
      </Pickable>
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
          at={[0.58, 0.3, 0.18]}
          rows={4}
          cols={4}
          spacing={0.035}
          length={0.16}
          radius={0.008}
          color="#d5dbe3"
          active={focus === "utah"}
        />
      </Pickable>
      <Pickable id="threads" onPick={onPick}>
        <Threads active={focus === "threads"} />
      </Pickable>
      <Pickable id="connexus" onPick={onPick}>
        <NeedleBed
          at={[0.5, 0.02, 0.28]}
          rows={5}
          cols={3}
          spacing={0.022}
          length={0.14}
          radius={0.005}
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
      aria-label="Pial surface from one public MRI. Click a part, or choose one in the list."
      camera={{ position: [1.85, 0.42, 1.45], fov: 32, near: 0.05, far: 20 }}
      dpr={[1, 2]}
      frameloop={reduced ? "demand" : "always"}
      gl={{ antialias: true, localClippingEnabled: true, alpha: true }}
    >
      <hemisphereLight args={["#f4ebe6", "#141820", 0.55]} />
      <directionalLight position={[2.4, 3.2, 1.6]} intensity={2.4} />
      <directionalLight position={[-2.2, 0.4, -1.4]} intensity={0.55} color="#c9b7d8" />
      <directionalLight position={[0.2, -1.2, 2.4]} intensity={0.35} color="#ffd8cc" />
      <Scene focus={focus} onPick={onPick} />
      <OrbitControls
        enablePan={false}
        autoRotate={!reduced}
        autoRotateSpeed={0.35}
        enableDamping
        minDistance={1.35}
        maxDistance={4.2}
        target={[0, 0.02, 0]}
      />
    </Canvas>
  );
}
