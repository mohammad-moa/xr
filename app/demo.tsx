"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Place = { id:string; name:string; icon:string; distance:number; bearing:number };
const places:Place[]=[
 {id:"radio",name:"رادیولوژی",icon:"🩻",distance:42,bearing:35},
 {id:"lab",name:"آزمایشگاه",icon:"🧪",distance:65,bearing:92},
 {id:"cardio",name:"قلب",icon:"❤️",distance:88,bearing:145},
];
const clamp=(n:number,min:number,max:number)=>Math.min(max,Math.max(min,n));
const norm=(n:number)=>((n%360)+360)%360;
const shortest=(n:number)=>{const a=norm(n);return a>180?a-360:a};

function CameraAR({place,onExit}:{place:Place;onExit:()=>void}){
 const video=useRef<HTMLVideoElement>(null); const stream=useRef<MediaStream|null>(null);
 const lastMag=useRef(0); const lastStep=useRef(0); const mounted=useRef(true);
 const [ready,setReady]=useState(false),[error,setError]=useState("");
 const [heading,setHeading]=useState<number|null>(null),[steps,setSteps]=useState(0);
 const [remaining,setRemaining]=useState(place.distance),[stepLength,setStepLength]=useState(.72);
 const [message,setMessage]=useState("QR ورودی: موقعیت دقیق ثبت شد");
 const [scan,setScan]=useState(false);
 useEffect(()=>{
  mounted.current=true;
  (async()=>{
    try{
      if(!navigator.mediaDevices?.getUserMedia) throw new Error("getUserMedia unavailable");

      const isMobile=/Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
      let selectedDeviceId="";

      // On desktop, prefer iVCam automatically when it is exposed as a webcam.
      // On real phones, prefer the rear/environment camera.
      if(!isMobile){
        // Camera labels are usually hidden until permission is granted, so ask once,
        // enumerate, then immediately stop that temporary stream.
        const permissionStream=await navigator.mediaDevices.getUserMedia({video:true,audio:false});
        permissionStream.getTracks().forEach(t=>t.stop());

        const cameras=(await navigator.mediaDevices.enumerateDevices()).filter(d=>d.kind==="videoinput");
        const iVCam=cameras.find(d=>/ivcam|e2esoft/i.test(d.label));
        if(iVCam) selectedDeviceId=iVCam.deviceId;
      }

      const constraints:MediaStreamConstraints={
        video:selectedDeviceId
          ? {deviceId:{exact:selectedDeviceId},width:{ideal:1280},height:{ideal:720}}
          : isMobile
            ? {facingMode:{ideal:"environment"},width:{ideal:1280},height:{ideal:720}}
            : {width:{ideal:1280},height:{ideal:720}},
        audio:false
      };

      const s=await navigator.mediaDevices.getUserMedia(constraints);
      if(!mounted.current){s.getTracks().forEach(t=>t.stop());return;}
      stream.current=s;
      if(video.current){
        const el=video.current;
        el.autoplay=false;
        el.muted=true;
        el.playsInline=true;
        el.srcObject=s;
        await new Promise<void>((resolve,reject)=>{
          const onLoaded=()=>{cleanup();resolve()};
          const onError=()=>{cleanup();reject(new Error("Video element failed to load stream"))};
          const cleanup=()=>{el.removeEventListener("loadedmetadata",onLoaded);el.removeEventListener("error",onError)};
          if(el.readyState>=1) resolve();
          else {el.addEventListener("loadedmetadata",onLoaded,{once:true});el.addEventListener("error",onError,{once:true})}
        });
        await el.play();
      }
      setReady(true);
    }catch(err){
      console.error("Camera error:",err);
      const e=err as DOMException;
      setError(`دوربین باز نشد: ${e?.name||"UnknownError"}${e?.message?` — ${e.message}`:""}`);
    }
  })();
  return()=>{mounted.current=false;stream.current?.getTracks().forEach(t=>t.stop())};
},[]);
 useEffect(()=>{
   const orient=(e:DeviceOrientationEvent)=>{const x=e as DeviceOrientationEvent&{webkitCompassHeading?:number}; if(typeof x.webkitCompassHeading==='number'){setHeading(norm(x.webkitCompassHeading));}else if(typeof e.alpha==='number'){setHeading(norm(360-e.alpha));}};
   window.addEventListener("deviceorientationabsolute",orient,true);window.addEventListener("deviceorientation",orient,true);
   return()=>{window.removeEventListener("deviceorientationabsolute",orient,true);window.removeEventListener("deviceorientation",orient,true)};
 },[]);
 useEffect(()=>{const motion=(e:DeviceMotionEvent)=>{const a=e.accelerationIncludingGravity;if(!a)return;const m=Math.hypot(a.x??0,a.y??0,a.z??0);const delta=Math.abs(m-lastMag.current);lastMag.current=m;const now=performance.now();if(delta>1.35&&m>10.2&&now-lastStep.current>280){lastStep.current=now;setSteps(s=>s+1);setRemaining(d=>Math.max(0,Number((d-stepLength).toFixed(1))))}};window.addEventListener("devicemotion",motion);return()=>window.removeEventListener("devicemotion",motion)},[stepLength]);
 const angle=useMemo(()=>heading===null?0:shortest(place.bearing-heading),[heading,place.bearing]);
 const recalibrate=(n:number)=>{setSteps(0);const corrected=clamp(place.distance-n*17,0,place.distance);setRemaining(Number(corrected.toFixed(1)));setMessage(`QR شماره ${n+1} اسکن شد • موقعیت دوباره تنظیم شد`)};
 const realScan=async()=>{const C=(window as Window&{BarcodeDetector?:new(o?:{formats?:string[]})=>{detect:(s:CanvasImageSource)=>Promise<Array<{rawValue?:string}>>}}).BarcodeDetector;if(!C||!video.current){setMessage("اسکنر QR این مرورگر در دسترس نیست؛ از QR Demo استفاده کنید.");return}try{const d=new C({formats:["qr_code"]});const codes=await d.detect(video.current);if(!codes[0]?.rawValue){setMessage("QR پیدا نشد؛ دوربین را روبه‌روی QR بگیرید.");return}setMessage(`QR شناسایی شد: ${codes[0].rawValue} • موقعیت Re-calibrate شد`);setSteps(0);setRemaining(d=>Math.max(0,Number((d-17).toFixed(1))));setScan(false)}catch{setMessage("خواندن QR انجام نشد؛ دوباره تلاش کنید.")}};
 if(error)return <main className="camera-error"><div className="error-card"><div className="big">📷</div><h2>دوربین در دسترس نیست</h2><p>{error}</p><button className="primary wide" onClick={onExit}>بازگشت</button></div></main>;
 return <main className="camera-screen"><video ref={video} className="camera-video" playsInline muted/><div className="camera-shade"/>
  <div className="camera-ui"><div className="camera-top"><button className="glass-button" onClick={onExit}>← خروج</button><div className="status-pill">● {ready?"دوربین فعال":"در حال باز کردن..."}</div></div>
   <div className="destination-card"><span>{place.icon}</span><div><b>{place.name}</b><small>{remaining.toFixed(1)} متر تا مقصد</small></div></div>
   <div className="ar-center"><div className="distance-bubble">{remaining.toFixed(1)}m</div><div className="arrow-ar" style={{transform:`rotate(${angle}deg)`}}>↑</div><div className="ar-label">{heading===null?"حرکت دهید تا Heading خوانده شود":`جهت گوشی ${Math.round(heading)}° • زاویه مقصد ${Math.round(angle)}°`}</div></div>
   <div className="tracking-panel"><div><b>{steps}</b><small>قدم</small></div><div><b>{stepLength.toFixed(2)}m</b><small>طول قدم</small></div><div><b>{heading===null?"—":`${Math.round(heading)}°`}</b><small>Heading</small></div></div>
   <div className="camera-bottom"><div className="qr-status">▦ {message}</div><div className="action-row"><button className="qr-button" onClick={()=>setScan(true)}>📷 اسکن QR</button><button className="qr-button" onClick={()=>recalibrate(1)}>QR بعدی (Demo)</button><button className="qr-button secondary" onClick={()=>{setSteps(0);setRemaining(place.distance);setMessage("موقعیت به QR ورودی Reset شد")}}>Reset</button></div>
    <label className="step-setting">طول قدم <input type="range" min=".45" max="1" step=".01" value={stepLength} onChange={e=>setStepLength(Number(e.target.value))}/><span>{stepLength.toFixed(2)}m</span></label><small>فاصله نقشه دقیق است؛ حرکت بین QRها با قدم‌شمار گوشی تخمین زده می‌شود.</small></div>
  </div>
  {scan&&<div className="scanner-modal"><div className="scanner-card"><button className="close-scanner" onClick={()=>setScan(false)}>×</button><h3>QR را روبه‌روی دوربین بگیرید</h3><div className="scanner-frame"/><button className="primary wide" onClick={realScan}>خواندن QR</button><p>در مرورگرهایی که BarcodeDetector ندارند، از QR Demo استفاده کنید.</p></div></div>}
 </main>
}

export default function Demo(){const[place,setPlace]=useState<Place|null>(null);const[ar,setAr]=useState(false);if(ar&&place)return <CameraAR place={place} onExit={()=>setAr(false)}/>;return <main className="shell"><header><div><span className="eyebrow">CAMERA AR + MOTION PROOF OF CONCEPT</span><h1>مسیریابی AR بیمارستان</h1><p>QR → موقعیت → Camera → Heading → Step Detection → فلش</p></div><span className="badge">بدون Beacon</span></header><section className="card"><div className="qr"><div className="qr-symbol">▦</div><b>QR ورودی اسکن شد</b><small>موقعیت فعلی: ورودی اصلی</small></div><h2>مقصد را انتخاب کنید</h2><div className="places">{places.map(p=><button className="place" key={p.id} onClick={()=>setPlace(p)}><span>{p.icon}</span><div><b>{p.name}</b><small>{p.distance} متر • bearing {p.bearing}°</small></div><i>←</i></button>)}</div></section>{place&&<section className="card route"><div className="route-title"><div><small>مقصد</small><h2>{place.icon} {place.name}</h2></div><button className="link" onClick={()=>setPlace(null)}>تغییر</button></div><div className="mini-map"><div className="line"/><div className="you">●</div><div className="target">🎯</div><span className="m1">ورودی / QR 01</span><span className="m2">{place.name}</span></div><div className="info"><div><b>{place.distance}m</b><small>فاصله نقشه</small></div><div><b>{place.bearing}°</b><small>جهت مقصد</small></div><div><b>QR</b><small>Anchor</small></div></div><button className="primary wide" onClick={()=>setAr(true)}>باز کردن دوربین و شروع AR</button></section>}<div className="note"><b>MVP v2</b><span>دوربین واقعی + Heading + Step Detection + QR Re-calibration. فاصله بین دو QR از نقشه دقیق است و حرکت بین آن‌ها تخمینی است.</span></div></main>}
