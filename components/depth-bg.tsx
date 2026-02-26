'use client';

import { Canvas } from '@react-three/fiber';

function Blob() {
  return (
    <mesh rotation={[0.4, 0.2, 0]}>
      <sphereGeometry args={[1.3, 32, 32]} />
      <meshStandardMaterial color="#22D3EE" transparent opacity={0.35} />
    </mesh>
  );
}

export default function DepthBg() {
  return (
    <div className="absolute inset-0 -z-10 opacity-50">
      <Canvas camera={{ position: [0, 0, 3] }}>
        <ambientLight intensity={0.8} />
        <pointLight position={[4, 2, 4]} intensity={1.2} />
        <Blob />
      </Canvas>
    </div>
  );
}
