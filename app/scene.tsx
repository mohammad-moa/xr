 "use client";
import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

export function Arrow3D({distance}:{distance:number}){
 const ref=useRef<THREE.Group>(null);
 useFrame(({clock})=>{
   if(ref.current){
     ref.current.position.y=Math.sin(clock.elapsedTime*2)*0.04-0.15;
     ref.current.rotation.z=Math.sin(clock.elapsedTime*2)*0.04;
   }
 });
 return <group ref={ref} position={[0,-0.15,-2]}>
   <mesh rotation={[Math.PI/2,0,0]}>
     <coneGeometry args={[0.22,0.65,4]}/>
     <meshStandardMaterial color="#4f7cff" transparent opacity={0.92}/>
   </mesh>
   <mesh position={[0,0,-0.42]} rotation={[Math.PI/2,0,0]}>
     <boxGeometry args={[0.16,0.75,0.08]}/>
     <meshStandardMaterial color="#4f7cff" transparent opacity={0.92}/>
   </mesh>
 </group>
}