import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Compass, Footprints, MapPinned, Navigation, Pause, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FloorCanvas } from "@/components/floor-canvas";
import type { FloorPlan, MapNode } from "@/lib/floorplan/types";
import {
  headingFor,
  pathLengthPx,
  pointAlongPath,
  shortestPath,
  signedDeg,
  normDeg,
} from "@/lib/floorplan/pathfinding";

type XRFrameLike = {
  session: {
    renderState: {
      baseLayer: {
        framebuffer: WebGLFramebuffer;
        getViewport: (v: unknown) => { x: number; y: number; width: number; height: number };
      };
    };
  };
  getViewerPose: (rs: unknown) => {
    transform: { position: { x: number; y: number; z: number } };
    views: Array<{ projectionMatrix: Float32Array; transform: { inverse: { matrix: Float32Array } } }>;
  } | null;
};

/** ضرب دو ماتریس ۴×۴ ستون‌محور (همون قراردادی که WebGL/WebXR استفاده می‌کنن). */
function mat4Multiply(a: Float32Array, b: Float32Array): Float32Array {
  const out = new Float32Array(16);
  for (let col = 0; col < 4; col++) {
    for (let row = 0; row < 4; row++) {
      let sum = 0;
      for (let k = 0; k < 4; k++) sum += a[k * 4 + row] * b[col * 4 + k];
      out[col * 4 + row] = sum;
    }
  }
  return out;
}

/** یه شِیدرِ خیلی ساده فقط برای رنگ‌کردنِ خط — بدون هیچ نور/بافت. */
function createLineProgram(gl: WebGLRenderingContext): WebGLProgram {
  const vs = gl.createShader(gl.VERTEX_SHADER)!;
  gl.shaderSource(vs, "attribute vec3 aPos; uniform mat4 uMVP; void main(){ gl_Position = uMVP * vec4(aPos, 1.0); }");
  gl.compileShader(vs);
  const fs = gl.createShader(gl.FRAGMENT_SHADER)!;
  gl.shaderSource(fs, "precision mediump float; uniform vec4 uColor; void main(){ gl_FragColor = uColor; }");
  gl.compileShader(fs);
  const program = gl.createProgram()!;
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  return program;
}

/**
 * مسیر (نودهای پیکسلی نقشه) رو به یه نوارِ سه‌بعدیِ روی زمین تبدیل می‌کنه —
 * دقیقاً همون خطی که قراره روی کف واقعی «چسبیده» به نظر برسه. هر پاره‌خط رو
 * به یه مستطیل نازک (دو مثلث) با پهنای ثابت تبدیل می‌کنه.
 */
function buildFloorLineVertices(
  path: MapNode[],
  origin: MapNode,
  headingDeg: number,
  start: { x: number; y: number; z: number },
  metersPerPixel: number,
  floorY: number,
  halfWidthM = 0.08,
): Float32Array {
  const theta = (headingDeg * Math.PI) / 180;
  const toWorld = (n: { x: number; y: number }) => {
    const east = (n.x - origin.x) * metersPerPixel;
    const north = -(n.y - origin.y) * metersPerPixel;
    const dx = east * Math.cos(theta) - north * Math.sin(theta);
    const dz = -(east * Math.sin(theta) + north * Math.cos(theta));
    return { x: start.x + dx, y: floorY, z: start.z + dz };
  };
  const pts = path.map(toWorld);
  const verts: number[] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i];
    const b = pts[i + 1];
    let dirX = b.x - a.x;
    let dirZ = b.z - a.z;
    const len = Math.hypot(dirX, dirZ) || 1;
    dirX /= len;
    dirZ /= len;
    const perpX = -dirZ * halfWidthM;
    const perpZ = dirX * halfWidthM;
    const a1 = [a.x - perpX, a.y, a.z - perpZ];
    const a2 = [a.x + perpX, a.y, a.z + perpZ];
    const b1 = [b.x - perpX, b.y, b.z - perpZ];
    const b2 = [b.x + perpX, b.y, b.z + perpZ];
    verts.push(...a1, ...a2, ...b1, ...a2, ...b2, ...b1);
  }
  return new Float32Array(verts);
}

function routeMetricsAtPoint(
  path: MapNode[],
  point: { x: number; y: number },
) {
  if (path.length < 2) {
    return { remainingPx: 0, bearingDeg: 0 };
  }

  const totalPx = pathLengthPx(path);
  let bestDistanceSq = Number.POSITIVE_INFINITY;
  let bestTravelledPx = 0;
  let bestBearingDeg = headingFor(path[0], path[1]);
  let cumulativePx = 0;

  for (let i = 0; i < path.length - 1; i++) {
    const a = path[i];
    const b = path[i + 1];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const lenSq = dx * dx + dy * dy;
    const len = Math.sqrt(lenSq);

    if (len === 0) continue;

    const t = Math.max(
      0,
      Math.min(1, ((point.x - a.x) * dx + (point.y - a.y) * dy) / lenSq),
    );
    const px = a.x + dx * t;
    const py = a.y + dy * t;
    const distanceSq = (point.x - px) ** 2 + (point.y - py) ** 2;

    if (distanceSq < bestDistanceSq) {
      bestDistanceSq = distanceSq;
      bestTravelledPx = cumulativePx + len * t;
      bestBearingDeg = headingFor(a, b);
    }

    cumulativePx += len;
  }

  return {
    remainingPx: Math.max(0, totalPx - bestTravelledPx),
    bearingDeg: bestBearingDeg,
  };
}

type Phase = "pick" | "preview" | "guide";

/** حداقل شکلی از XRSession که استفاده می‌کنیم — کتابخانه‌ی نوع WebXR رسمی توی این پروژه نصب نیست. */
type XRSessionLike = {
  end: () => Promise<void>;
  requestAnimationFrame: (cb: (t: number, frame: unknown) => number | void) => number;
  updateRenderState: (state: Record<string, unknown>) => void;
  requestReferenceSpace: (type: string) => Promise<unknown>;
  addEventListener: (type: string, cb: () => void) => void;
};

const STEP_LENGTH_M = 0.75; // میانگین طول قدم — قابل کالیبره‌کردن
const STEP_THRESHOLD = 1.6; // آستانه‌ی شتاب برای تشخیص قدم — روی گوشی واقعی تنظیم کن
const STEP_COOLDOWN_MS = 300; // حداقل فاصله بین دو قدم پشت‌سرهم

function GuideArrow({ angle }: { angle: number }) {
  return (
    <div
      className="grid size-24 place-items-center rounded-full bg-nav-fg/10 transition-transform duration-[var(--motion-fast)] ease-[var(--ease-out)]"
      style={{ transform: `rotate(${angle}deg)` }}
    >
      <svg viewBox="0 0 64 64" className="size-14" aria-hidden>
        <path d="M32 6 52 56 32 44 12 56Z" fill="currentColor" />
      </svg>
    </div>
  );
}

export function NavigateView({ plan }: { plan: FloorPlan }) {
  const [destination, setDestination] = useState<MapNode | null>(null);
  const [phase, setPhase] = useState<Phase>("pick");
  const [travelled, setTravelled] = useState(0);
  const [heading, setHeading] = useState<number | null>(null);
  const [simHeading, setSimHeading] = useState(0);
  const [walking, setWalking] = useState(false);
  const [camReady, setCamReady] = useState(false);
  const [stepCount, setStepCount] = useState(0);
  const [motionActive, setMotionActive] = useState(false);
  const [sensorError, setSensorError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const walkRef = useRef<number | null>(null);
  const lastTs = useRef<number | null>(null);
  const totalPxRef = useRef(0);
  const filteredAccRef = useRef(9.8);
  const lastStepRef = useRef(0);
  const motionAttachedRef = useRef(false);
  const targetBearingRef = useRef(0);
  const liveHeadingRef = useRef(0);
  const hasCompassRef = useRef(false);
  // --- AR واقعی (WebXR / ARCore — فقط Chrome روی اندروید) ---
  const [arSupported, setArSupported] = useState<boolean | null>(null);
  const [arActive, setArActive] = useState(false);
  const [arError, setArError] = useState<string | null>(null);
  const [arHint, setArHint] = useState<string | null>(null);
  const [arPos, setArPos] = useState<{ x: number; y: number } | null>(null);
  const arSessionRef = useRef<XRSessionLike | null>(null);
  const arStartHeadingRef = useRef(0);
  const arStartWorldPosRef = useRef<{ x: number; y: number; z: number } | null>(null);
  const arNoPoseSinceRef = useRef<number | null>(null);
  const arOverlayRef = useRef<HTMLDivElement>(null);
  const arLastUpdateRef = useRef(0);
  const glLineRef = useRef<{
    gl: WebGLRenderingContext;
    program: WebGLProgram;
    posLoc: number;
    mvpLoc: WebGLUniformLocation | null;
    colorLoc: WebGLUniformLocation | null;
    vbo: WebGLBuffer | null;
    vertexCount: number;
  } | null>(null);

  const originNode = plan.nodes.find((n) => n.kind === "origin");
  const destinationNodes = plan.nodes.filter((n) => n.kind === "destination");
  const pathNodes = useMemo(
    () =>
      originNode && destination
        ? shortestPath(plan.nodes, plan.edges, originNode.id, destination.id)
        : [],
    [originNode, destination, plan.nodes, plan.edges],
  );
  const totalPx = useMemo(() => pathLengthPx(pathNodes), [pathNodes]);
  useEffect(() => { totalPxRef.current = totalPx; }, [totalPx]);
  const totalM = totalPx * plan.metersPerPixel;
  const remainingM = Math.max(0, (totalPx - travelled) * plan.metersPerPixel);
  const traveler = pathNodes.length ? pointAlongPath(pathNodes, travelled) : null;
  const arrived = remainingM < 0.4 && pathNodes.length > 0;
  const targetBearing = traveler ? headingFor(traveler.from, traveler.to) : 0;
  const liveHeading = heading ?? simHeading;
  const arrowAngle = arrived ? 0 : signedDeg(targetBearing - liveHeading);
  useEffect(() => { targetBearingRef.current = targetBearing; }, [targetBearing]);
  useEffect(() => { liveHeadingRef.current = liveHeading; }, [liveHeading]);
  useEffect(() => { hasCompassRef.current = heading !== null; }, [heading]);

  // در AR واقعی، فاصله و جهت را نسبت به نزدیک‌ترین نقطه روی مسیر حساب می‌کنیم
  // تا مسیر راهرو حفظ شود و فاصله، خط مستقیم تا مقصد نباشد.
  const arRouteMetrics = arActive && arPos ? routeMetricsAtPoint(pathNodes, arPos) : null;
  const arRemainingM = arRouteMetrics
    ? arRouteMetrics.remainingPx * plan.metersPerPixel
    : null;
  const arBearing = arRouteMetrics?.bearingDeg ?? 0;
  const arArrowAngle = signedDeg(arBearing - liveHeading);
  const arArrived = arRemainingM !== null && arRemainingM < 0.4;
  const hasValidScale = Number.isFinite(plan.metersPerPixel) && plan.metersPerPixel > 0;

  async function requestCompass() {
    const DOE = DeviceOrientationEvent as unknown as {
      requestPermission?: () => Promise<string>;
    };
    try {
      if (typeof DOE.requestPermission === "function") await DOE.requestPermission();
    } catch {
      /* desktop / denied */
    }
  }

  function onOrientHandler(e: DeviceOrientationEvent) {
    const x = e as DeviceOrientationEvent & { webkitCompassHeading?: number };
    if (typeof x.webkitCompassHeading === "number") setHeading(normDeg(x.webkitCompassHeading));
    else if (typeof e.alpha === "number") setHeading(normDeg(360 - e.alpha));
  }

  // شمارش قدم واقعی از روی شتاب‌سنج گوشی (devicemotion) — با جهت واقعی حرکت
  function onMotionHandler(e: DeviceMotionEvent) {
    const acc = e.accelerationIncludingGravity || e.acceleration;
    if (!acc || acc.x === null) return;
    const mag = Math.sqrt((acc.x || 0) ** 2 + (acc.y || 0) ** 2 + (acc.z || 0) ** 2);
    filteredAccRef.current = filteredAccRef.current * 0.9 + mag * 0.1;
    const dynamic = mag - filteredAccRef.current;
    const now = Date.now();
    if (dynamic > STEP_THRESHOLD && now - lastStepRef.current > STEP_COOLDOWN_MS) {
      lastStepRef.current = now;
      setStepCount((c) => c + 1);
      // اگه قطب‌نمای واقعی گوشی متصل نیست (فقط شبیه‌ساز روی صفحه)، جهت واقعیِ
      // بدنت رو نمی‌دونیم — پس فرض می‌کنیم هر قدم رو به جلوئه.
      const diff = hasCompassRef.current
        ? Math.abs(signedDeg(targetBearingRef.current - liveHeadingRef.current))
        : 0;
      const stepPx = STEP_LENGTH_M / plan.metersPerPixel;
      const forward = diff <= 90; // هم‌جهت با مسیر
      setTravelled((t) =>
        Math.max(0, Math.min(totalPxRef.current, t + (forward ? stepPx : -stepPx))),
      );
    }
  }

  async function requestMotionAndAttach() {
    if (motionAttachedRef.current) return;
    try {
      const DME = DeviceMotionEvent as unknown as { requestPermission?: () => Promise<string> };
      if (typeof DME.requestPermission === "function") {
        const res = await DME.requestPermission();
        if (res !== "granted") {
          setSensorError("اجازه‌ی دسترسی به شتاب‌سنج داده نشد.");
          return;
        }
      }
      window.addEventListener("devicemotion", onMotionHandler, true);
      motionAttachedRef.current = true;
      setMotionActive(true);
      setSensorError(null);
    } catch {
      setSensorError("این مرورگر به شتاب‌سنج دسترسی نمی‌دهد.");
    }
  }

  useEffect(() => {
    // اندروید/دسکتاپ نیاز به requestPermission ندارند، مستقیم گوش می‌دیم
    const DOE = typeof window !== "undefined"
      ? (window.DeviceOrientationEvent as unknown as { requestPermission?: unknown })
      : undefined;
    if (DOE && typeof DOE.requestPermission !== "function") {
      window.addEventListener("deviceorientation", onOrientHandler, true);
      window.addEventListener("devicemotion", onMotionHandler, true);
      motionAttachedRef.current = true;
      setMotionActive(true);
    }
    // فقط Chrome روی اندروید (ARCore) به immersive-ar جواب مثبت می‌ده
    const xr = (navigator as unknown as { xr?: { isSessionSupported: (m: string) => Promise<boolean> } }).xr;
    if (xr?.isSessionSupported) {
      xr.isSessionSupported("immersive-ar").then(setArSupported).catch(() => setArSupported(false));
    } else {
      setArSupported(false);
    }
    return () => {
      window.removeEventListener("deviceorientation", onOrientHandler, true);
      window.removeEventListener("devicemotion", onMotionHandler, true);
      arSessionRef.current?.end().catch(() => {});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * روشن‌کردن AR واقعی: یه session خام WebXR می‌گیریم و مسیر رو به‌صورت یه
   * نوارِ سبزِ نیمه‌شفاف، مستقیم روی فریم‌بافرِ دوربین (بدون three.js، فقط
   * WebGL خام) رسم می‌کنیم — طوری که انگار واقعاً روی زمین چسبیده. هم‌زمان،
   * موقعیت واقعیِ گوشی رو هم برای فاصله/فلشِ بالای صفحه حساب می‌کنیم.
   */
  async function startArSession() {
    setArError(null);
    const xr = (navigator as unknown as {
      xr?: { requestSession: (mode: string, opts: Record<string, unknown>) => Promise<XRSessionLike> };
    }).xr;
    if (!xr) {
      setArError("این مرورگر از AR واقعی پشتیبانی نمی‌کند.");
      return;
    }
    try {
      const canvas = document.createElement("canvas");
      const gl = canvas.getContext("webgl", { xrCompatible: true }) as (WebGLRenderingContext & {
        makeXRCompatible?: () => Promise<void>;
      }) | null;
      if (!gl) throw new Error("no-webgl");
      if (gl.makeXRCompatible) await gl.makeXRCompatible();

      const program = createLineProgram(gl);
      glLineRef.current = {
        gl,
        program,
        posLoc: gl.getAttribLocation(program, "aPos"),
        mvpLoc: gl.getUniformLocation(program, "uMVP"),
        colorLoc: gl.getUniformLocation(program, "uColor"),
        vbo: gl.createBuffer(),
        vertexCount: 0,
      };

      const session = await xr.requestSession("immersive-ar", {
        requiredFeatures: ["local"],
        optionalFeatures: arOverlayRef.current ? ["dom-overlay"] : [],
        ...(arOverlayRef.current ? { domOverlay: { root: arOverlayRef.current } } : {}),
      });
      arSessionRef.current = session;

      const XRWebGLLayerCtor = (window as unknown as { XRWebGLLayer: new (s: unknown, g: unknown) => unknown })
        .XRWebGLLayer;
      session.updateRenderState({ baseLayer: new XRWebGLLayerCtor(session, gl) });
      // local-floor gives us a floor-relative coordinate system when the browser
      // supports it. We fall back to local for browsers that do not.
      let refSpace: unknown;
      try {
        refSpace = await session.requestReferenceSpace("local-floor");
      } catch {
        refSpace = await session.requestReferenceSpace("local");
      }

      if (!hasValidScale) {
        await session.end();
        throw new Error("مقیاس واقعی نقشه تنظیم نشده است. ابتدا مقیاس نقشه را در پنل ادمین تعیین کنید.");
      }

      // The QR/map origin is our zero point. We deliberately do not use a hard-coded
      // pixel-to-meter value here; the scale must come from the published floor plan.
      arStartHeadingRef.current =
        pathNodes.length > 1 ? headingFor(pathNodes[0], pathNodes[1]) : 0;
      arStartWorldPosRef.current = null;
      arNoPoseSinceRef.current = null;
      setArHint(null);
      setArActive(true);

      const onXRFrame = (_t: number, frame: unknown) => {
        session.requestAnimationFrame(onXRFrame);
        try {
          const f = frame as XRFrameLike;
          const pose = f.getViewerPose(refSpace);
          if (!pose) {
            // معمولاً یعنی ARCore هنوز نتونسته ردیابی رو شروع کنه — نیاز به
            // یه‌کم جابه‌جاییِ واقعیِ گوشی داره، نه فقط چرخوندنش.
            if (arNoPoseSinceRef.current === null) arNoPoseSinceRef.current = performance.now();
            else if (performance.now() - arNoPoseSinceRef.current > 4000) {
              setArHint("گوشی رو چند ثانیه آروم جابه‌جا کن (نه فقط بچرخون) تا ردیابی شروع بشه");
            }
            return;
          }
          arNoPoseSinceRef.current = null;
          setArHint(null);
          const p = pose.transform.position;

          if (!arStartWorldPosRef.current) {
            arStartWorldPosRef.current = { x: p.x, y: p.y, z: p.z };
            if (originNode) {
              setArPos({ x: originNode.x, y: originNode.y });
            }
            // خط رو فقط یه‌بار، همین که موقعیت شروع مشخص شد، می‌سازیم
            if (originNode && pathNodes.length > 1 && glLineRef.current) {
              const verts = buildFloorLineVertices(
                pathNodes,
                originNode,
                arStartHeadingRef.current,
                arStartWorldPosRef.current,
                plan.metersPerPixel,
                0,
              );
              const line = glLineRef.current;
              line.gl.bindBuffer(line.gl.ARRAY_BUFFER, line.vbo);
              line.gl.bufferData(line.gl.ARRAY_BUFFER, verts, line.gl.STATIC_DRAW);
              line.vertexCount = verts.length / 3;
            }
            return;
          }

          // --- رسم خط روی زمین، هر فریم (برای اینکه ثابت روی کف بمونه) ---
          const line = glLineRef.current;
          const baseLayer = f.session.renderState.baseLayer;
          if (line && baseLayer && line.vertexCount > 0) {
            const { gl: lgl, program: lprog, posLoc, mvpLoc, colorLoc, vbo } = line;
            lgl.bindFramebuffer(lgl.FRAMEBUFFER, baseLayer.framebuffer);
            lgl.clearColor(0, 0, 0, 0);
            lgl.clear(lgl.COLOR_BUFFER_BIT | lgl.DEPTH_BUFFER_BIT);
            lgl.enable(lgl.BLEND);
            lgl.blendFunc(lgl.SRC_ALPHA, lgl.ONE_MINUS_SRC_ALPHA);
            lgl.useProgram(lprog);
            lgl.bindBuffer(lgl.ARRAY_BUFFER, vbo);
            lgl.enableVertexAttribArray(posLoc);
            lgl.vertexAttribPointer(posLoc, 3, lgl.FLOAT, false, 0, 0);
            lgl.uniform4f(colorLoc, 0.16, 0.85, 0.55, 0.9); // سبزِ نیمه‌شفاف، مثل خط ناوبری گوگل‌مپس
            for (const view of pose.views) {
              const vp = baseLayer.getViewport(view);
              lgl.viewport(vp.x, vp.y, vp.width, vp.height);
              const mvp = mat4Multiply(view.projectionMatrix, view.transform.inverse.matrix);
              lgl.uniformMatrix4fv(mvpLoc, false, mvp);
              lgl.drawArrays(lgl.TRIANGLES, 0, line.vertexCount);
            }
          }

          const now = performance.now();
          if (now - arLastUpdateRef.current < 100) return; // ~۱۰ بار در ثانیه برای آپدیت UI کافیه
          arLastUpdateRef.current = now;

          const dx = p.x - arStartWorldPosRef.current.x;
          const dz = p.z - arStartWorldPosRef.current.z;
          const theta = (arStartHeadingRef.current * Math.PI) / 180;
          // چرخوندن جابه‌جاییِ محلیِ AR به مختصات شمال/شرقِ نقشه، طبق جهتِ کالیبراسیونِ لحظه‌ی شروع (نه قطب‌نما)
          const east = dx * Math.cos(theta) - dz * Math.sin(theta);
          const north = -dx * Math.sin(theta) - dz * Math.cos(theta);
          if (originNode) {
            setArPos({
              x: originNode.x + east / plan.metersPerPixel,
              y: originNode.y - north / plan.metersPerPixel,
            });
          }
        } catch (err) {
          setArError((prev) => prev ?? (err instanceof Error ? `خطای رندر AR: ${err.message}` : "خطای نامشخص در رندر AR"));
        }
      };
      session.requestAnimationFrame(onXRFrame);
      session.addEventListener("end", () => {
        setArActive(false);
        setArPos(null);
        setArHint(null);
        arSessionRef.current = null;
        glLineRef.current = null;
      });
    } catch (err) {
      setArError(err instanceof Error ? err.message : "شروع AR واقعی ناموفق بود.");
    }
  }

  function stopArSession() {
    arSessionRef.current?.end().catch(() => {});
  }

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  useEffect(() => {
    if (!walking || arrived) {
      if (walkRef.current) cancelAnimationFrame(walkRef.current);
      walkRef.current = null;
      lastTs.current = null;
      if (arrived) setWalking(false);
      return;
    }
    const speedMps = 1.15;
    const tick = (ts: number) => {
      if (lastTs.current == null) lastTs.current = ts;
      const dt = Math.min(0.1, (ts - lastTs.current) / 1000);
      lastTs.current = ts;
      const stepPx = (speedMps * dt) / plan.metersPerPixel;
      setTravelled((t) => Math.min(totalPx, t + stepPx));
      walkRef.current = requestAnimationFrame(tick);
    };
    walkRef.current = requestAnimationFrame(tick);
    return () => {
      if (walkRef.current) cancelAnimationFrame(walkRef.current);
    };
  }, [walking, arrived, totalPx, plan.metersPerPixel]);

  useEffect(() => {
    if (traveler && heading === null) setSimHeading(traveler.heading);
  }, [traveler?.heading, heading, traveler]);

  async function startGuide() {
    setPhase("guide");
    setTravelled(0);
    setStepCount(0);
    setWalking(false);
    await requestCompass();
    await requestMotionAndAttach();
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
      streamRef.current = s;
      if (videoRef.current) {
        videoRef.current.srcObject = s;
        await videoRef.current.play();
      }
      setCamReady(true);
    } catch {
      setCamReady(false);
    }
  }

  function exitGuide() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCamReady(false);
    setWalking(false);
    setPhase(destination ? "preview" : "pick");
  }

  function pick(d: MapNode) {
    setDestination(d);
    setTravelled(0);
    setWalking(false);
    setPhase("preview");
  }

  if (!originNode || destinationNodes.length === 0) {
    return (
      <div className="mx-auto max-w-md px-5 py-16 text-center">
        <MapPinned className="mx-auto size-8 text-primary" />
        <p className="mt-3 text-sm text-muted">
          هنوز نقشه‌ای آماده نیست. در تب «ویرایش نقشه» یک مبدأ (QR) و حداقل یک مقصد بگذارید.
        </p>
      </div>
    );
  }

  if (phase === "pick") {
    return (
      <div className="mx-auto w-full max-w-lg px-3 pb-10 pt-4 sm:px-4">
        <h2 className="text-lg font-semibold tracking-tight">کجا می‌روید؟</h2>
        <p className="mt-1 mb-4 text-sm text-muted">
          مقصد را انتخاب کنید تا کوتاه‌ترین مسیر روی نقشه نمونه دیده شود.
        </p>
        <ul className="flex flex-col gap-2">
          {destinationNodes.map((d) => {
            const p = shortestPath(plan.nodes, plan.edges, originNode.id, d.id);
            const meters = pathLengthPx(p) * plan.metersPerPixel;
            const reachable = p.length > 0;
            return (
              <li key={d.id}>
                <button
                  type="button"
                  onClick={() => reachable && pick(d)}
                  disabled={!reachable}
                  className="flex w-full items-center gap-3 rounded-2xl bg-surface-2 px-4 py-3 text-right shadow-[var(--shadow-border)] transition-[box-shadow] duration-[var(--motion-quick)] hover:shadow-[var(--shadow-border-hover)] disabled:opacity-40"
                >
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <MapPinned className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{d.name || d.id}</span>
                    <span className="block text-xs text-muted tabular-nums">
                      {reachable ? `${meters.toFixed(0)} متر از ورودی` : "مسیر وصل نیست"}
                    </span>
                  </span>
                  <ArrowRight className="size-4 rotate-180 text-subtle" />
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    );
  }

  if (phase === "preview" && destination) {
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-3 px-3 pb-10 pt-3 sm:px-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium text-muted">مسیر تا</p>
            <h2 className="text-lg font-semibold">{destination.name}</h2>
            <p className="mt-1 text-sm text-muted tabular-nums">
              {pathNodes.length
                ? `${totalM.toFixed(0)} متر · ${Math.max(1, pathNodes.length - 1)} بخش`
                : "مسیری پیدا نشد — اتصال‌ها را در ویرایشگر چک کنید"}
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setPhase("pick")}>
            عوض کردن
          </Button>
        </div>
        <div className="overflow-hidden rounded-2xl bg-surface-2 p-2 shadow-[var(--shadow-border)]">
          <div className="overflow-hidden rounded-xl outline outline-1 -outline-offset-1 outline-fg/10">
            <FloorCanvas plan={plan} path={pathNodes} travelledPx={0} interactive={false} />
          </div>
        </div>
        <Button className="h-12 w-full" onClick={startGuide} disabled={!pathNodes.length}>
          <Navigation />
          شروع ناوبری
        </Button>
        <p className="text-center text-xs text-subtle">
          روی گوشی، دوربین و قطب‌نما فعال می‌شوند. در پیش‌نمایش می‌توانید مسیر را شبیه‌سازی کنید.
        </p>
      </div>
    );
  }

  return (
    <div className="relative isolate min-h-[calc(100dvh-3.5rem)] overflow-hidden bg-nav text-nav-fg">
      <video
        ref={videoRef}
        muted
        playsInline
        className="pointer-events-none absolute inset-0 size-full object-cover"
        style={{ opacity: camReady ? 1 : 0 }}
      />

      <div
        ref={arOverlayRef}
        className="relative z-10 mx-auto flex min-h-[calc(100dvh-3.5rem)] w-full max-w-3xl flex-col justify-between gap-3 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
      >
        <div className="flex items-center justify-between gap-2">
          <Button
            variant="secondary"
            size="sm"
            className="bg-nav-fg/12 text-nav-fg shadow-none hover:bg-nav-fg/18"
            onClick={exitGuide}
          >
            <ArrowRight className="rotate-180" />
            خروج
          </Button>
          <Badge variant="muted" className="bg-nav-fg/12 text-nav-fg">
            {arActive ? "AR واقعی فعال" : camReady ? "دوربین فعال" : "پیش‌نمایش مسیر"}
          </Badge>
        </div>

        <div className="absolute right-2 top-14 z-20 w-[140px] overflow-hidden rounded-xl bg-black/45 p-1 shadow-lg backdrop-blur-sm">
          <div className="overflow-hidden rounded-lg">
            <FloorCanvas
              plan={plan}
              path={pathNodes}
              travelledPx={arActive && arPos ? undefined : travelled}
              interactive={false}
            />
          </div>
        </div>

        <div className="flex flex-col items-center text-center">
          <p className="text-4xl font-semibold tabular-nums tracking-tight">
            {arActive
              ? arArrived
                ? "رسیدید"
                : arRemainingM !== null
                  ? `${arRemainingM.toFixed(0)} m`
                  : "در حال یافتن موقعیت..."
              : arrived
                ? "رسیدید"
                : `${remainingM.toFixed(0)} m`}
          </p>
          <GuideArrow angle={arActive ? arArrowAngle : arrowAngle} />
          <p className="mt-1 rounded-full bg-nav-fg/12 px-3 py-1 text-xs tabular-nums">
            {arActive
              ? arArrived
                ? `به ${destination?.name ?? ""} رسیدید`
                : "موقعیت واقعی (ARCore)"
              : arrived
                ? `به ${destination?.name ?? ""} رسیدید`
                : heading === null
                  ? `شبیه‌ساز قطب‌نما · بخش ${traveler?.legIndex ?? 0}/${Math.max(1, pathNodes.length - 1)}`
                  : `بخش ${traveler?.legIndex ?? 0}/${Math.max(1, pathNodes.length - 1)}`}
          </p>
        </div>

        <div className="space-y-2">
          {arSupported && !arActive && (
            <p className="rounded-xl bg-amber-500/15 px-3 py-2 text-center text-xs text-nav-fg">
              گوشی را در جهت شروع مسیر نگه دار تا خط روی کف با مسیر نقشه هم‌راستا شود.
            </p>
          )}
          {arSupported && (
            <Button
              variant="secondary"
              className={`w-full shadow-none ${arActive ? "bg-red-500/80 text-white hover:bg-red-500" : "bg-nav-fg/12 text-nav-fg hover:bg-nav-fg/18"}`}
              onClick={arActive ? stopArSession : startArSession}
            >
              <Navigation />
              {arActive ? "توقف AR" : "فعال‌سازی AR"}
            </Button>
          )}
          {arError && (
            <p className="rounded-xl bg-nav-fg/10 px-3 py-2 text-center text-xs text-nav-fg/80">
              {arError}
            </p>
          )}
          {arHint && (
            <p className="rounded-xl bg-amber-500/20 px-3 py-2 text-center text-xs text-nav-fg">
              {arHint}
            </p>
          )}
          {!arActive && (
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="secondary"
                className="bg-nav-fg/12 text-nav-fg shadow-none hover:bg-nav-fg/18"
                onClick={() => setWalking((w) => !w)}
                disabled={arrived}
              >
                {walking ? <Pause /> : <Play />}
                {walking ? "توقف شبیه‌سازی" : "شبیه‌سازی حرکت"}
              </Button>
              <div className="flex items-center justify-center gap-2 rounded-2xl bg-nav-fg/12 px-3 text-xs">
                <Footprints className="size-4 shrink-0" />
                {motionActive ? `${stepCount} قدم واقعی` : "قدم‌شمار غیرفعال"}
              </div>
            </div>
          )}
          {!motionActive && !arActive && (
            <Button
              variant="secondary"
              className="w-full bg-nav-fg/12 text-nav-fg shadow-none hover:bg-nav-fg/18"
              onClick={requestMotionAndAttach}
            >
              <Compass />
              فعال‌سازی قطب‌نما و قدم‌شمار (iOS)
            </Button>
          )}
          {sensorError && (
            <p className="rounded-xl bg-nav-fg/10 px-3 py-2 text-center text-xs text-nav-fg/80">
              {sensorError}
            </p>
          )}
          {heading === null && !arActive && (
            <label className="flex items-center gap-3 rounded-xl bg-nav-fg/10 px-3 py-2 text-xs">
              <Compass className="size-4 shrink-0" />
              <span className="w-16 tabular-nums">{Math.round(simHeading)}°</span>
              <input
                type="range"
                min={0}
                max={359}
                value={Math.round(simHeading)}
                onChange={(e) => setSimHeading(Number(e.target.value))}
                className="h-11 w-full accent-primary"
              />
            </label>
          )}
        </div>
      </div>
    </div>
  );
}
