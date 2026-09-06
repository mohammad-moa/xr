'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import map from '../data/map.json';

type Destination = typeof map.destinations[number];
type QrPayload = { source?:string; destinationId?:string; destination?:{x:number;y:number;name?:string} };
const clamp=(n:number,a:number,b:number)=>Math.max(a,Math.min(b,n));
const dist=(a:{x:number;y:number},b:{x:number;y:number})=>Math.hypot(b.x-a.x,b.y-a.y);
const headingFor=(a:{x:number;y:number},b:{x:number;y:number})=>((Math.atan2(b.x-a.x,-(b.y-a.y))*180/Math.PI)+360)%360;
const norm=(n:number)=>((n%360)+360)%360;
const signed=(n:number)=>{const x=norm(n);return x>180?x-360:x};

function parseQR(raw:string):QrPayload|null{try{const x=JSON.parse(raw);if(x?.destinationId||x?.destination)return x}catch{};try{const u=new URL(raw);const d=u.searchParams.get('destinationId');if(d)return {source:u.searchParams.get('source')||undefined,destinationId:d}}catch{};return null}

function Scanner({onResult,onClose}:{onResult:(p:QrPayload)=>void;onClose:()=>void}){
 const video=useRef<HTMLVideoElement>(null);const stream=useRef<MediaStream|null>(null);const [msg,setMsg]=useState('دوربین را روی QR اتاق A بگیرید');const [running,setRunning]=useState(false);
 useEffect(()=>{let dead=false;(async()=>{try{if(!navigator.mediaDevices?.getUserMedia)throw new Error('Camera API unavailable');const s=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'},width:{ideal:1280},height:{ideal:720}},audio:false});if(dead){s.getTracks().forEach(t=>t.stop());return}stream.current=s;if(video.current){video.current.srcObject=s;await video.current.play()}setRunning(true)}catch(e){setMsg('دوربین باز نشد؛ مجوز Camera را فعال کنید.')}})();return()=>{dead=true;stream.current?.getTracks().forEach(t=>t.stop())}},[]);
 const read=async()=>{const B=(window as Window&{BarcodeDetector?:new(o?:{formats?:string[]})=>{detect:(s:CanvasImageSource)=>Promise<Array<{rawValue?:string}>>}}).BarcodeDetector;if(!B||!video.current){setMsg('این مرورگر BarcodeDetector ندارد. برای تست از دکمه «QR نمونه» استفاده کنید.');return}try{const codes=await new B({formats:['qr_code']}).detect(video.current);const raw=codes[0]?.rawValue||'';const p=parseQR(raw);if(!p){setMsg('QR خوانده شد اما payload معتبر نیست.');return}onResult(p)}catch{setMsg('QR پیدا نشد؛ دوربین را ثابت‌تر نگه دارید.')}};
 return <div className="modal"><div className="scanner"><button className="x" onClick={onClose}>×</button><h2>اسکن QR اتاق A</h2><p>این تنها QR لازم در سناریوی فعلی است. QR باید مبدأ و مقصد را حمل کند.</p><div className="view"><video ref={video} muted playsInline/><div className="corners"/></div><button className="primary wide" onClick={read}>خواندن QR</button><div className="scanmsg">{running?'● دوربین فعال':'○ در حال آماده‌سازی'} — {msg}</div><button className="secondary wide" onClick={()=>onResult({source:'ROOM-A',destinationId:'MRI'})}>QR نمونه MRI</button></div></div>
}

function MiniMap({destination}:{destination:Destination}){const ox=map.origin.x,oy=map.origin.y;const points=[map.routeNodes[0],map.routeNodes[1],map.routeNodes[2],map.routeNodes[3],{x:destination.x,y:destination.y}];const xs=[ox,destination.x,...map.routeNodes.map(n=>n.x)],ys=[oy,destination.y,...map.routeNodes.map(n=>n.y)];const minX=Math.min(...xs)-2,maxX=Math.max(...xs)+2,minY=Math.min(...ys)-2,maxY=Math.max(...ys)+2;const px=(x:number)=>`${((x-minX)/(maxX-minX))*88+6}%`,py=(y:number)=>`${100-((y-minY)/(maxY-minY))*82-9}%`;return <div className="map"><svg viewBox="0 0 100 100" preserveAspectRatio="none"><polyline points={points.map(p=>`${((p.x-minX)/(maxX-minX))*88+6},${100-((p.y-minY)/(maxY-minY))*82-9}`).join(' ')} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg><span className="dot start" style={{left:px(ox),top:py(oy)}}>●</span><span className="dot end" style={{left:px(destination.x),top:py(destination.y)}}>🎯</span><small className="label startlabel">QR / اتاق A</small><small className="label endlabel" style={{left:px(destination.x),top:py(destination.y)}}>{destination.name}</small></div>}

// Full route: every routeNode in order, then the final destination.
// This replaces the old "pick one midpoint or go straight" shortcut —
// the walker now advances through each waypoint in sequence, so
// multi-turn corridors get a correct turn-by-turn heading at every leg.
function buildWaypoints(destination:Destination){
  return [...map.routeNodes.map(n=>({x:n.x,y:n.y})), {x:destination.x,y:destination.y}];
}
function routeTotalLength(wps:{x:number;y:number}[]){
  let t=0;for(let i=1;i<wps.length;i++)t+=dist(wps[i-1],wps[i]);return t;
}

function AR({destination,onExit}:{destination:Destination;onExit:()=>void}){
 const video=useRef<HTMLVideoElement>(null);const stream=useRef<MediaStream|null>(null);const lastMag=useRef(9.8);const lastStep=useRef(0);const [heading,setHeading]=useState<number|null>(null);const [steps,setSteps]=useState(0);const [stepLen,setStepLen]=useState(.72);const [ready,setReady]=useState(false);

 // waypoints[0] is always the QR origin (map.origin); we walk from
 // waypoints[wpIndex-1] -> waypoints[wpIndex] and advance wpIndex once
 // the estimated remaining distance to the current target drops near 0.
 const waypoints=useMemo(()=>[map.origin,...buildWaypoints(destination)],[destination]);
 const totalLen=useMemo(()=>routeTotalLength(waypoints),[waypoints]);
 const [travelled,setTravelled]=useState(0); // meters walked so far, along the whole route

 // Derive which leg we're on and how far along it, purely from `travelled`.
 const {legIndex,legRemaining,currentTarget,arrived}=useMemo(()=>{
   let acc=0;
   for(let i=1;i<waypoints.length;i++){
     const legLen=dist(waypoints[i-1],waypoints[i]);
     if(travelled<acc+legLen||i===waypoints.length-1){
       return {legIndex:i,legRemaining:Math.max(0,acc+legLen-travelled),currentTarget:waypoints[i],arrived:i===waypoints.length-1&&travelled>=acc+legLen-0.15};
     }
     acc+=legLen;
   }
   return {legIndex:waypoints.length-1,legRemaining:0,currentTarget:waypoints[waypoints.length-1],arrived:true};
 },[travelled,waypoints]);

 const overallRemaining=Math.max(0,totalLen-travelled);
 const targetBearing=headingFor(waypoints[legIndex-1]??map.origin,currentTarget);
 const arrowAngle=heading===null?0:signed(targetBearing-heading);

 useEffect(()=>{let dead=false;(async()=>{try{const s=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'},width:{ideal:1280},height:{ideal:720}},audio:false});if(dead){s.getTracks().forEach(t=>t.stop());return}stream.current=s;if(video.current){video.current.srcObject=s;await video.current.play()}setReady(true)}catch{}})();return()=>{dead=true;stream.current?.getTracks().forEach(t=>t.stop())}},[]);
 useEffect(()=>{const f=(e:DeviceOrientationEvent)=>{const x=e as DeviceOrientationEvent&{webkitCompassHeading?:number};if(typeof x.webkitCompassHeading==='number')setHeading(norm(x.webkitCompassHeading));else if(typeof e.alpha==='number')setHeading(norm(360-e.alpha))};window.addEventListener('deviceorientationabsolute',f,true);window.addEventListener('deviceorientation',f,true);return()=>{window.removeEventListener('deviceorientationabsolute',f,true);window.removeEventListener('deviceorientation',f,true)}},[]);
 useEffect(()=>{const f=(e:DeviceMotionEvent)=>{const a=e.accelerationIncludingGravity;if(!a)return;const m=Math.hypot(a.x??0,a.y??0,a.z??0);const delta=Math.abs(m-lastMag.current);lastMag.current=m;const now=performance.now();if(delta>1.35&&m>10.2&&now-lastStep.current>350){lastStep.current=now;setSteps(s=>s+1);setTravelled(t=>Math.min(totalLen,Number((t+stepLen).toFixed(2))))}};window.addEventListener('devicemotion',f);return()=>window.removeEventListener('devicemotion',f)},[stepLen,totalLen]);

 const turnLabel=(()=>{if(arrived)return 'رسیدید';if(legRemaining<1.2&&legIndex<waypoints.length-1)return 'در تقاطع بعدی بپیچید';return 'مستقیم بروید'})();

 return <main className="ar"><video ref={video} className="camera" muted playsInline/><div className="shade"/><div className="arui"><div className="top"><button className="glass" onClick={onExit}>← خروج</button><span className="pill">● {ready?'دوربین فعال':'در حال باز کردن...'}</span></div><div className="dest"><span>{destination.icon}</span><div><b>{destination.name}</b><small>مقصد ثبت‌شده از QR اتاق A</small></div></div><div className="center"><div className="meters">{overallRemaining.toFixed(1)} m</div><div className="bigarrow" style={{transform:`rotate(${arrowAngle}deg)`}}>↑</div><div className="hint">{arrived?'رسیدید به مقصد':heading===null?'گوشی را حرکت دهید تا جهت‌نما فعال شود':`${turnLabel} • waypoint ${legIndex}/${waypoints.length-1}`}</div></div><div className="stats"><div><b>{steps}</b><small>قدم</small></div><div><b>{stepLen.toFixed(2)}m</b><small>طول قدم</small></div><div><b>{Math.round(overallRemaining)}m</b><small>باقی‌مانده</small></div></div><div className="bottom"><button className="glass" onClick={()=>{setSteps(0);setTravelled(0)}}>Reset مسیر</button><label>طول قدم <input type="range" min=".45" max="1" step=".01" value={stepLen} onChange={e=>setStepLen(Number(e.target.value))}/></label><small>مسیر الان از تمام waypointهای نقشه به ترتیب رد می‌شود (نه فقط یک نود میانی)؛ پیشرفت با شمارش قدم تخمین زده می‌شود و بدون QR میانی ممکن است drift داشته باشد.</small></div></div></main>
}

export default function Page(){const [destination,setDestination]=useState<Destination|null>(null);const [scanner,setScanner]=useState(false);const [ar,setAr]=useState(false);const [qr,setQr]=useState<QrPayload|null>(null);const selected=destination;
 const apply=(p:QrPayload)=>{let d:Destination|undefined;if(p.destinationId)d=map.destinations.find(x=>x.id===p.destinationId);if(!d&&p.destination)d={id:'QR-DEST',name:p.destination.name||'مقصد سفارشی',icon:'📍',x:p.destination.x,y:p.destination.y};if(!d)return;setQr(p);setDestination(d);setScanner(false)};
 if(ar&&selected)return <AR destination={selected} onExit={()=>setAr(false)}/>;
 return <main className="shell"><header><div><span className="eyebrow">SINGLE QR • INDOOR AR PROOF OF CONCEPT</span><h1>مسیریابی داخل بیمارستان</h1><p>فقط یک QR در اتاق A؛ مبدأ و مقصد از همان QR خوانده می‌شود.</p></div><span className="badge">بدون QR بین مسیر</span></header><section className="hero card"><div className="qrbox"><div className="qricon">▦</div><b>QR اتاق A</b><small>payload: source + destination</small></div><div className="flow"><span>QR اتاق A</span><i>→</i><span>محاسبه مسیر</span><i>→</i><span>Camera AR</span></div><button className="primary wide" onClick={()=>setScanner(true)}>📷 اسکن QR اتاق A</button><button className="secondary wide" onClick={()=>apply({source:'ROOM-A',destinationId:'MRI'})}>استفاده از QR نمونه MRI</button></section>{selected&&<section className="card"><div className="routehead"><div><small>مقصد استخراج‌شده از QR</small><h2>{selected.icon} {selected.name}</h2></div><button className="link" onClick={()=>{setDestination(null);setQr(null)}}>تغییر</button></div><MiniMap destination={selected}/><div className="info"><div><b>{dist(map.origin,selected).toFixed(1)}m</b><small>فاصله مستقیم</small></div><div><b>{Math.round(headingFor(map.origin,selected))}°</b><small>جهت اولیه</small></div><div><b>1 QR</b><small>Anchor</small></div></div><div className="qrpayload"><b>QR payload</b><code>{JSON.stringify(qr||{source:'ROOM-A',destinationId:selected.id})}</code></div><button className="primary wide" onClick={()=>setAr(true)}>شروع مسیریابی با دوربین</button></section>}<section className="card"><h2>منطق نسخه جدید</h2><div className="steps"><div><b>۱</b><span>QR داخل اتاق A اسکن می‌شود.</span></div><div><b>۲</b><span>سیستم مبدأ و مقصد را از QR می‌گیرد.</span></div><div><b>۳</b><span>مسیر از روی نقشه از پیش تعریف‌شده ساخته می‌شود.</span></div><div><b>۴</b><span>دوربین باز می‌شود و فلش جهت مسیر را نشان می‌دهد.</span></div></div></section>{scanner&&<Scanner onResult={apply} onClose={()=>setScanner(false)}/>}</main>}
