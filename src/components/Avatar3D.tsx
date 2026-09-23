import { Canvas, useFrame } from '@react-three/fiber';
import { Component, useRef, type ReactNode } from 'react';
import * as THREE from 'three';
import { speechActivity } from '../lib/speech';

export type AvatarMode = 'idle' | 'speaking' | 'listening' | 'thinking';

const SKIN = '#c98f6d';
const HAIR = '#2b1d16';
const BLAZER = '#2c3e66';
const SHIRT = '#eef1f6';
const IRIS = '#3b2a20';
const LIPS = '#8e4a45';

const lerp = THREE.MathUtils.lerp;

function Interviewer({ mode }: { mode: AvatarMode }) {
  const torso = useRef<THREE.Group>(null);
  const head = useRef<THREE.Group>(null);
  const eyes = useRef<THREE.Group[]>([]);
  const irises = useRef<THREE.Mesh[]>([]);
  const brows = useRef<THREE.Group>(null);
  const mouth = useRef<THREE.Mesh>(null);
  const anim = useRef({ nextBlink: 2, blinkStart: -1, mouthOpen: 0, gazeX: 0, gazeY: 0, nextGaze: 3 });

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    const a = anim.current;

    // Breathing.
    if (torso.current) torso.current.scale.y = 1 + Math.sin(t * 1.6) * 0.008;

    // Head: gentle idle sway, plus mode-specific poses.
    if (head.current) {
      let rx = Math.sin(t * 0.53) * 0.03;
      let ry = Math.sin(t * 0.37) * 0.06;
      let rz = Math.sin(t * 0.29) * 0.02;
      if (mode === 'listening') {
        rx += 0.04 + 0.08 * Math.pow(Math.max(0, Math.sin(t * 1.1)), 14); // occasional nod
      } else if (mode === 'thinking') {
        rz += 0.12;
        ry -= 0.12;
        rx -= 0.05;
      } else if (mode === 'speaking') {
        rx += Math.sin(t * 5.3) * 0.015;
      }
      const k = 1 - Math.pow(0.02, delta);
      head.current.rotation.x = lerp(head.current.rotation.x, rx, k);
      head.current.rotation.y = lerp(head.current.rotation.y, ry, k);
      head.current.rotation.z = lerp(head.current.rotation.z, rz, k);
    }

    // Eyes: occasional glances; look up and aside while thinking.
    if (t > a.nextGaze) {
      a.gazeX = (Math.random() - 0.5) * 0.012;
      a.gazeY = (Math.random() - 0.5) * 0.006;
      a.nextGaze = t + 1.5 + Math.random() * 3;
    }
    const gx = mode === 'thinking' ? 0.01 : mode === 'listening' ? 0 : a.gazeX;
    const gy = mode === 'thinking' ? 0.01 : mode === 'listening' ? 0 : a.gazeY;
    irises.current.forEach((iris) => {
      iris.position.x = lerp(iris.position.x, gx, 0.15);
      iris.position.y = lerp(iris.position.y, gy, 0.15);
    });

    // Blinking every 2–5 seconds.
    if (t > a.nextBlink && a.blinkStart < 0) a.blinkStart = t;
    let eyeScale = 1;
    if (a.blinkStart >= 0) {
      const p = (t - a.blinkStart) / 0.16;
      if (p >= 1) {
        a.blinkStart = -1;
        a.nextBlink = t + 2 + Math.random() * 3;
      } else {
        eyeScale = Math.max(0.08, Math.abs(1 - 2 * p));
      }
    }
    eyes.current.forEach((e) => (e.scale.y = eyeScale));

    // Eyebrows lift a little while speaking or listening.
    if (brows.current) {
      const target = mode === 'speaking' ? 0.006 + Math.max(0, Math.sin(t * 1.7)) * 0.006 : mode === 'listening' ? 0.004 : 0;
      brows.current.position.y = lerp(brows.current.position.y, target, 0.1);
    }

    // Mouth: open and close while speaking, with a pulse on each word boundary.
    const speaking = mode === 'speaking' && speechActivity.speaking;
    const sinceWord = (performance.now() - speechActivity.lastWordAt) / 1000;
    const wordPulse = sinceWord < 0.18 ? 1 - sinceWord / 0.18 : 0;
    const target = speaking
      ? 0.25 + 0.5 * Math.abs(Math.sin(t * 11)) * (0.6 + 0.4 * Math.sin(t * 3.7)) + 0.35 * wordPulse
      : 0;
    a.mouthOpen = lerp(a.mouthOpen, Math.min(1, target), 0.35);
    if (mouth.current) mouth.current.scale.y = 0.12 + a.mouthOpen * 0.6;
  });

  const eyeX = [-0.072, 0.072];

  return (
    <group position={[0, 0, 0]}>
      {/* Torso: blazer + shirt */}
      <group ref={torso} position={[0, 1.02, 0]}>
        <mesh scale={[1.38, 1, 0.72]}>
          <capsuleGeometry args={[0.26, 0.36, 8, 24]} />
          <meshStandardMaterial color={BLAZER} roughness={0.7} />
        </mesh>
      </group>

      {/* Shirt collar */}
      <mesh position={[0, 1.375, 0.01]} rotation={[Math.PI / 2 - 0.15, 0, 0]}>
        <torusGeometry args={[0.078, 0.024, 12, 32]} />
        <meshStandardMaterial color={SHIRT} roughness={0.8} />
      </mesh>

      {/* Neck */}
      <mesh position={[0, 1.44, 0]}>
        <cylinderGeometry args={[0.068, 0.075, 0.16, 20]} />
        <meshStandardMaterial color={SKIN} roughness={0.6} />
      </mesh>

      {/* Head */}
      <group ref={head} position={[0, 1.62, 0]}>
        <mesh scale={[0.92, 1.08, 0.95]}>
          <sphereGeometry args={[0.2, 48, 48]} />
          <meshStandardMaterial color={SKIN} roughness={0.55} />
        </mesh>

        {/* Hair */}
        <mesh position={[0, 0.035, -0.015]} scale={[0.97, 1.1, 1.0]} rotation={[-0.6, 0, 0]}>
          <sphereGeometry args={[0.205, 48, 48, 0, Math.PI * 2, 0, Math.PI * 0.42]} />
          <meshStandardMaterial color={HAIR} roughness={0.9} side={THREE.DoubleSide} />
        </mesh>
        <mesh position={[0, -0.01, -0.06]} scale={[0.95, 1.05, 0.85]}>
          <sphereGeometry args={[0.2, 32, 32]} />
          <meshStandardMaterial color={HAIR} roughness={0.9} />
        </mesh>

        {/* Ears */}
        {[-1, 1].map((s) => (
          <mesh key={s} position={[s * 0.18, 0.0, 0]} scale={[0.5, 1, 0.7]}>
            <sphereGeometry args={[0.04, 16, 16]} />
            <meshStandardMaterial color={SKIN} roughness={0.6} />
          </mesh>
        ))}

        {/* Eyes */}
        {eyeX.map((x, i) => (
          <group
            key={x}
            position={[x, 0.03, 0.158]}
            ref={(el) => {
              if (el) eyes.current[i] = el;
            }}
          >
            <mesh scale={[1.15, 0.85, 0.6]}>
              <sphereGeometry args={[0.032, 24, 24]} />
              <meshStandardMaterial color="#fbfbfb" roughness={0.3} />
            </mesh>
            <mesh
              position={[0, 0, 0.016]}
              ref={(el) => {
                if (el) irises.current[i] = el;
              }}
            >
              <sphereGeometry args={[0.016, 20, 20]} />
              <meshStandardMaterial color={IRIS} roughness={0.2} />
            </mesh>
          </group>
        ))}

        {/* Glasses */}
        {eyeX.map((x) => (
          <mesh key={`g${x}`} position={[x, 0.03, 0.19]}>
            <torusGeometry args={[0.046, 0.005, 10, 32]} />
            <meshStandardMaterial color="#1c1c22" roughness={0.4} metalness={0.3} />
          </mesh>
        ))}
        <mesh position={[0, 0.035, 0.195]}>
          <boxGeometry args={[0.05, 0.006, 0.006]} />
          <meshStandardMaterial color="#1c1c22" />
        </mesh>

        {/* Eyebrows */}
        <group ref={brows}>
          {eyeX.map((x) => (
            <mesh key={`b${x}`} position={[x, 0.092, 0.172]} rotation={[0, 0, x < 0 ? 0.08 : -0.08]}>
              <boxGeometry args={[0.06, 0.011, 0.012]} />
              <meshStandardMaterial color={HAIR} />
            </mesh>
          ))}
        </group>

        {/* Nose */}
        <mesh position={[0, -0.025, 0.19]} scale={[0.9, 1.3, 1]}>
          <sphereGeometry args={[0.022, 20, 20]} />
          <meshStandardMaterial color={SKIN} roughness={0.55} />
        </mesh>

        {/* Mouth */}
        <mesh ref={mouth} position={[0, -0.095, 0.168]} scale={[1, 0.12, 0.35]}>
          <sphereGeometry args={[0.042, 24, 24]} />
          <meshStandardMaterial color="#4a1d1d" roughness={0.8} />
        </mesh>
        <mesh position={[0, -0.088, 0.176]} scale={[1, 0.25, 0.3]}>
          <sphereGeometry args={[0.044, 24, 24, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial color={LIPS} roughness={0.6} />
        </mesh>
      </group>
    </group>
  );
}

/** Shows a simple 2D stand-in if the device can't render 3D (no WebGL). */
class WebGLBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

function webglAvailable(): boolean {
  try {
    const c = document.createElement('canvas');
    return Boolean(c.getContext('webgl2') ?? c.getContext('webgl'));
  } catch {
    return false;
  }
}

export function Avatar3D({ mode }: { mode: AvatarMode }) {
  const fallback = <div className={`avatar-fallback ${mode}`} aria-hidden>A</div>;
  if (!webglAvailable()) return fallback;
  return (
    <WebGLBoundary fallback={fallback}>
      <Canvas
        className="avatar-canvas"
        dpr={[1, 2]}
        camera={{ position: [0, 1.56, 1.85], fov: 30 }}
        onCreated={({ camera }) => camera.lookAt(0, 1.47, 0)}
        gl={{ alpha: true, antialias: true }}
      >
        <ambientLight intensity={0.55} />
        <hemisphereLight args={['#ffffff', '#6b7280', 0.6]} />
        <directionalLight position={[1.5, 2.5, 2]} intensity={1.6} />
        <directionalLight position={[-2, 1.5, 1]} intensity={0.5} color="#b9c8ff" />
        <Interviewer mode={mode} />
      </Canvas>
    </WebGLBoundary>
  );
}
