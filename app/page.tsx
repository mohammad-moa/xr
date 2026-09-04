"use client";
import { useEffect,useMemo,useRef,useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Engine,Scene,FreeCamera,Vector3,HemisphericLight,MeshBuilder,StandardMaterial,Color3 } from "@babylonjs/core";

type Point={id:string;name:string;x:number;y:number};
type Pose={x:number;y:number;heading:number};
const POINTS:Point[]=[
{id:"entrance",name:"ورودی",x:0,y:0},{id:"hall",name:"راهروی اصلی",x:18,y:0},
{id:"lab",name:"آزمایشگاه",x:32,y:0},{id:"mri",name:"رادیولوژی / MRI",x:42,y:12},
{id:"heart",name:"قلب",x:30,y:-16}];

const dist=(a:Pose,b:Point)=>Math.hypot(b.x-a.x,b.y-a.y);
const norm=(v:number)=>((v+180)%360+360)%360-180;
const bear=(a:Pose,b:Point)=>((Math.atan2(b.x-a.x,b.y-a.y)*180/Math.PI)+360)%360;

export default function Home(){
 const video=useRef<HTMLVideoElement>(null), canvas=useRef<HTMLCanvasElement>(null);
 const stream=useRef<MediaStream|null>(null), lastStep=useRef(0), prev=useRef(0), stepRef=useRef(.72);
 const [ready,setReady]=useState(false),[error,setError]=useState(""),[heading,setHeading]=useState(0);
 const [pos,setPos]=useState<Pose>({x:0,y:0,heading:0}),[destId,setDestId]=useState("mri");
 const [stepLen,setStepLen]=useState(.72),[steps,setSteps]=useState(0),[qrOpen,setQrOpen]=useState(false),[anchor,setAnchor]=useState("ورودی"),[auto,setAuto]=useState(true);
 const dest=useMemo(()=>POINTS.find(p=>p.id===destId)!,[destId]);
 const remaining=dist(pos,dest), rel=norm(bear(pos,dest)-heading);
 useEffect(()=>{stepRef.current=stepLen},[stepLen]);

 useEffect(()=>{let mounted=true;(async()=>{try{
  const s=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:"environment"},width:{ideal:1920},height:{ideal:1080}},audio:false});
  if(!mounted){s.getTracks().forEach(t=>t.stop());return} stream.current=s;
  if(video.current){video.current.srcObject=s;await video.current.play()} setReady(true);
 }catch(e){setError(e instanceof Error?e.message:"Camera unavailable")}})();
 return()=>{mounted=false;stream.current?.getTracks().forEach(t=>t.stop())}},[]);

 useEffect(()=>{const orientation=(e:DeviceOrientationEvent)=>{const x=e as DeviceOrientationEvent&{webkitCompassHeading?:number};const h=(typeof x.webkitCompassHeading==="number"?x.webkitCompassHeading:typeof x.alpha==="number"?360-x.alpha:0)+360;const hh=h%360;setHeading(hh);setPos(p=>({...p,heading:hh}))};
 const motion=(e:DeviceMotionEvent)=>{if(!auto)return;const a=e.accelerationIncludingGravity;if(!a)return;const m=Math.hypot(a.x??0,a.y??0,a.z??0),d=Math.abs(m-prev.current);prev.current=m;const now=performance.now();if(d>1.45&&now-lastStep.current>420){lastStep.current=now;setSteps(s=>s+1);setPos(p=>{const r=p.heading*Math.PI/180;return {...p,x:p.x+Math.sin(r)*stepRef.current,y:p.y+Math.cos(r)*stepRef.current}})}};
 addEventListener("deviceorientation",orientation);addEventListener("devicemotion",motion);return()=>{removeEventListener("deviceorientation",orientation);removeEventListener("devicemotion",motion)}},[auto]);

 useEffect(()=>{if(!canvas.current)return;const engine=new Engine(canvas.current,true);const scene=new Scene(engine);
 const cam=new FreeCamera("camera",new Vector3(0,1,-4),scene);cam.setTarget(Vector3.Zero());new HemisphericLight("light",new Vector3(0,1,0),scene);
 const arrow=MeshBuilder.CreateCylinder("arrow",{diameterTop:0,diameterBottom:.55,height:1.35,tessellation:4},scene);
 const mat=new StandardMaterial("arrowMat",scene);mat.diffuseColor=new Color3(.05,.85,1);mat.emissiveColor=new Color3(.02,.35,.55);arrow.material=mat;arrow.rotation.x=Math.PI/2;
 let t=0;engine.runRenderLoop(()=>{t+=engine.getDeltaTime()/1000;arrow.position.y=.05+Math.sin(t*3)*.03;arrow.rotation.z=rel*Math.PI/180;scene.render()});
 return()=>engine.dispose()},[rel]);

 const permissions=async()=>{try{const o=DeviceOrientationEvent as typeof DeviceOrientationEvent&{requestPermission?:()=>Promise<string>};if(o.requestPermission)await o.requestPermission();const m=DeviceMotionEvent as typeof DeviceMotionEvent&{requestPermission?:()=>Promise<string>};if(m.requestPermission)await m.requestPermission()}catch{}};
 const reset=()=>{setPos({x:0,y:0,heading});setSteps(0);setAnchor("ورودی")};
 const qr=(text:string)=>{const p=POINTS.find(x=>x.id===text.trim().toLowerCase());if(!p)return;setPos(v=>({x:p.x,y:p.y,heading:v.heading}));setSteps(0);setAnchor(p.name);setQrOpen(false)};
 useEffect(()=>{if(!qrOpen)return;const s=new Html5Qrcode("qr-reader");s.start({facingMode:"environment"},{fps:10,qrbox:{width:230,height:230}},t=>qr(t),()=>{}).catch(()=>setAnchor("اسکنر QR در این مرورگر در دسترس نیست"));return()=>{s.stop().catch(()=>{})}},[qrOpen]);

 return <main className="app">
  <video ref={video} className="camera" playsInline muted autoPlay/><canvas ref={canvas} className="babylon"/>
  <header><b>Hospital AR</b><small>Web Prototype</small><span>{ready?"● Camera":"○ Starting"}</span></header>
  <section className="destination"><span>مقصد</span><select value={destId} onChange={e=>setDestId(e.target.value)}>{POINTS.filter(p=>p.id!=="entrance").map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></section>
  <section className="card"><strong>{remaining.toFixed(1)} <i>m</i></strong><b>{dest.name}</b><small>{steps} قدم · جهت {heading.toFixed(0)}°</small></section>
  <div className="floor"><div className="arrow" style={{transform:`translateX(-50%) rotate(${rel}deg)`}}><span/></div></div>
  <section className="tracking"><div><span>Anchor</span><b>{anchor}</b></div><div><span>Position</span><b>{pos.x.toFixed(1)}m , {pos.y.toFixed(1)}m</b></div></section>
  <div className="buttons"><button onClick={permissions}>فعال‌سازی سنسورها</button><button onClick={()=>setQrOpen(true)}>اسکن QR</button><button onClick={()=>setAuto(v=>!v)}>{auto?"قدم‌شمار روشن":"قدم‌شمار خاموش"}</button><button onClick={reset}>Reset</button></div>
  <label className="slider">طول قدم {stepLen.toFixed(2)}m <input type="range" min=".45" max="1" step=".01" value={stepLen} onChange={e=>setStepLen(+e.target.value)}/></label>
  {error&&<div className="error">{error}<br/>برای دوربین از HTTPS یا localhost استفاده کن.</div>}
  {qrOpen&&<div className="modal"><div className="scanner"><b>QR Anchor را اسکن کنید</b><div id="qr-reader"/><div className="demo">{POINTS.map(p=><button key={p.id} onClick={()=>qr(p.id)}>Demo: {p.name}</button>)}</div><button onClick={()=>setQrOpen(false)}>بستن</button></div></div>}
 </main>
}