import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Environment, PerspectiveCamera, Stars } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette, Noise } from '@react-three/postprocessing';
import * as THREE from 'three';
import { Foliage } from './Foliage';
import { Ornaments } from './Ornaments';
import { UserPhotos } from './UserPhotos';
import { Gifts } from './Gifts';
import { TreeState } from '../types';

// --- Base Sparkles (Fireflies) ---
const BaseSparkles = () => {
  const count = 200;
  const mesh = useRef<THREE.Points>(null);

  const { positions, randoms } = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const rnd = new Float32Array(count);
    
    for (let i = 0; i < count; i++) {
        // Radius 10 to 20
        const r = 10 + Math.random() * 10; 
        const theta = Math.random() * Math.PI * 2;
        
        pos[i * 3] = r * Math.cos(theta); // x
        pos[i * 3 + 1] = -15 + Math.random() * 7; // y: -15 to -8
        pos[i * 3 + 2] = r * Math.sin(theta); // z
        
        rnd[i] = Math.random();
    }
    return { positions: pos, randoms: rnd };
  }, []);

  useFrame((state) => {
      if(mesh.current) {
          const time = state.clock.elapsedTime;
          // Gentle floating movement
          mesh.current.position.y = Math.sin(time * 0.2) * 0.5;
          mesh.current.rotation.y = time * 0.05;
      }
  });

  return (
      <points ref={mesh}>
          <bufferGeometry>
              <bufferAttribute attach="attributes-position" count={count} array={positions} itemSize={3} />
          </bufferGeometry>
          <pointsMaterial 
            size={0.15} 
            color="#FFEA00" 
            transparent 
            opacity={0.6} 
            blending={THREE.AdditiveBlending} 
            depthWrite={false}
          />
      </points>
  );
};

interface ExperienceProps {
  treeState: TreeState;
  setTreeState: (state: TreeState) => void;
  userPhotos: string[];
  focusedPhotoId: string | null;
  setFocusedPhotoId: (id: string | null) => void;
}

export const Experience: React.FC<ExperienceProps> = ({ 
  treeState, 
  setTreeState, 
  userPhotos,
  focusedPhotoId,
  setFocusedPhotoId
}) => {
  const cameraRef = useRef<THREE.PerspectiveCamera>(null);
  const groupRef = useRef<THREE.Group>(null);
  const starRef = useRef<THREE.Mesh>(null);
  
  const targetRotation = useRef({ x: 0, y: 0 });

  // Mouse Interaction Handler
  const handlePhotoClick = (id: string) => {
    setFocusedPhotoId(id);
    setTreeState(TreeState.FOCUS);
  };

  useFrame((state) => {
    // Animation Loop for Group Rotation
    if (groupRef.current) {
        if (treeState === TreeState.TREE_SHAPE) {
            // Default Auto Spin
            groupRef.current.rotation.y += 0.002;
            // Lerp back to 0 on X
            groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, 0, 0.05);
        } else if (treeState === TreeState.FOCUS) {
            // MODE: FOCUS - Center the Group
            // Smoothly reset rotation to 0,0,0 so the coordinate system aligns with Camera
            groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, 0, 0.1);
            groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, 0, 0.1);
        } else {
            // MODE: SCATTER - Rotation
            groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, targetRotation.current.y, 0.05);
            groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, targetRotation.current.x, 0.05);
        }
    }
    
    // Star Spin
    if (starRef.current) {
        starRef.current.rotation.y += 0.01;
    }
  });

  // Generate 5-pointed Star Shape
  const starShape = useMemo(() => {
    const shape = new THREE.Shape();
    const outerRadius = 1.5;
    const innerRadius = 0.7; // Depth of the star cuts
    const points = 5;

    for (let i = 0; i < points * 2; i++) {
      const angle = (i * Math.PI) / points;
      const radius = i % 2 === 0 ? outerRadius : innerRadius;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      if (i === 0) shape.moveTo(x, y);
      else shape.lineTo(x, y);
    }
    shape.closePath();
    return shape;
  }, []);

  const starExtrudeSettings = useMemo(() => ({
    depth: 0.5,
    bevelEnabled: true,
    bevelThickness: 0.1,
    bevelSize: 0.1,
    bevelSegments: 2
  }), []);

  return (
    <>
      <PerspectiveCamera makeDefault position={[0, 2, 25]} fov={50} ref={cameraRef} />
      
      <OrbitControls 
        enablePan={false} 
        minPolarAngle={Math.PI / 3} 
        maxPolarAngle={Math.PI / 1.8}
        minDistance={10}
        maxDistance={40}
      />

      {/* Lighting: Bright & Cheerful */}
      <ambientLight intensity={0.6} color="#ffffff" /> 
      <spotLight 
        position={[10, 20, 10]} 
        angle={0.5} 
        penumbra={1} 
        intensity={2} 
        color="#fff" 
        castShadow 
      />
      <pointLight position={[-10, 5, -10]} intensity={1.5} color="#FFEA00" />
      <pointLight position={[0, -5, 10]} intensity={0.5} color="#00BFFF" />

      <pointLight 
        position={[0, -12, 0]} 
        intensity={4.0} 
        distance={25} 
        color="#FFD700" 
        decay={2}
      />

      <Environment files="https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/potsdamer_platz_1k.hdr" />
      <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
      
      <group ref={groupRef} position={[0, -4, 0]}>
        <BaseSparkles />
        <pointLight position={[0, 6, 0]} intensity={1} color="#FFD700" distance={10} decay={2} />

        <Foliage state={treeState} count={12000} />
        <Ornaments state={treeState} count={600} />
        <Gifts state={treeState} />
        
        {/* Pass click handler and props */}
        <UserPhotos 
            photos={userPhotos} 
            state={treeState} 
            focusedId={focusedPhotoId}
            onPhotoClick={handlePhotoClick}
        />
        
        <group position={[0, 6.5, 0]}>
            <mesh 
                ref={starRef} 
                scale={treeState === TreeState.TREE_SHAPE ? 1 : 0}
                rotation={[0, 0, Math.PI / 10]} 
            >
                <extrudeGeometry args={[starShape, starExtrudeSettings]} />
                <meshStandardMaterial 
                    color="#FFD700" 
                    emissive="#FFD700" 
                    emissiveIntensity={2.0} 
                    toneMapped={false}
                />
                <pointLight color="#FFD700" distance={30} intensity={5} decay={2} />
            </mesh>
        </group>
      </group>

      <EffectComposer enableNormalPass={false}>
        <Bloom 
          luminanceThreshold={0.8} 
          mipmapBlur 
          intensity={1.2} 
          radius={0.5} 
        />
        <Vignette eskil={false} offset={0.1} darkness={1.0} />
        <Noise opacity={0.02} /> 
      </EffectComposer>
    </>
  );
};