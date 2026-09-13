/**
 * ناوبری کامل برای نقشهٔ متری:
 * انتخاب مقصد → دوربین → خط سبز پرسپکتیو + دستور پیچ + پیشرفت با قدم
 * بدون WebXR (پایدار روی همه گوشی‌ها برای دمو)
 */
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  Compass,
  Footprints,
  MapPinned,
  Navigation,
  Pause,
  Play,
} from "lucide-react";
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
import {
  currentTurnStep,
  getTurnInstructions,
  metersUntilNextTurn,
  type TurnStep,
} from "@/lib/floorplan/meter-map";

type Phase = "pick" | "guide";

const STEP_LENGTH_M = 0.7;
const STEP_THRESHOLD = 1.35;
const STEP_COOLDOWN_MS = 280;

function GuideArrow({ angle }: { angle: number }) {
  return (
    <div
      className="grid size-28 place-items-center rounded-full bg-white/15 transition-transform duration-200"
      style={{ transform: `rotate(${angle}deg)` }}
    >
      <svg viewBox="0 0 64 64" className="size-16 drop-shadow" aria-hidden>
        <path d="M32 6 52 56 32 44 12 56Z" fill="#22c55e" />
      </svg>
    </div>
  );
}

/** خط سبز پرسپکتیو روی دوربین — با انحراف برای پیچ */
function ArPathOverlay({
  progress,
  turnHint,
}: {
  progress: number;
  turnHint: "straight" | "left" | "right";
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    if (!parent) return;

    const draw = () => {
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      const p = Math.min(1, Math.max(0, progress));
      const vanishY = h * (0.42 + p * 0.28);
      const bottomY = h * 0.98;
      const pathLen = 1 - p;

      if (pathLen < 0.04) {
        ctx.beginPath();
        ctx.arc(w * 0.5, h * 0.55, w * 0.08, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(34,197,94,0.95)";
        ctx.lineWidth = w * 0.012;
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(w * 0.5, h * 0.55, w * 0.035, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(34,197,94,0.9)";
        ctx.fill();
        return;
      }

      const bend =
        turnHint === "left" ? -0.2 : turnHint === "right" ? 0.2 : 0;
      const bottomHalfW = w * 0.22;
      const topHalfW = w * (0.03 + pathLen * 0.04);
      const bx = w * 0.5;
      const tx = w * 0.5 + bend * w * pathLen;

      const grad = ctx.createLinearGradient(0, bottomY, 0, vanishY);
      grad.addColorStop(0, "rgba(34,197,94,0.85)");
      grad.addColorStop(0.6, "rgba(34,197,94,0.55)");
      grad.addColorStop(1, "rgba(34,197,94,0.08)");

      ctx.beginPath();
      ctx.moveTo(bx - bottomHalfW, bottomY);
      ctx.lineTo(bx + bottomHalfW, bottomY);
      ctx.lineTo(tx + topHalfW, vanishY);
      ctx.lineTo(tx - topHalfW, vanishY);
      ctx.closePath();
      ctx.fillStyle = grad;
      ctx.fill();

      ctx.strokeStyle = "rgba(187,247,208,0.9)";
      ctx.lineWidth = Math.max(2, w * 0.006);
      ctx.beginPath();
      ctx.moveTo(bx - bottomHalfW, bottomY);
      ctx.lineTo(tx - topHalfW, vanishY);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(bx + bottomHalfW, bottomY);
      ctx.lineTo(tx + topHalfW, vanishY);
      ctx.stroke();

      const arrowCount = Math.max(2, Math.floor(5 * pathLen));
      for (let i = 1; i <= arrowCount; i++) {
        const t = i / (arrowCount + 1);
        const y = bottomY + (vanishY - bottomY) * t;
        const half = bottomHalfW + (topHalfW - bottomHalfW) * t;
        const x = bx + (tx - bx) * t;
        const size = half * 0.35;
        ctx.beginPath();
        ctx.moveTo(x, y - size * 0.9);
        ctx.lineTo(x + size * 0.7, y + size * 0.5);
        ctx.lineTo(x - size * 0.7, y + size * 0.5);
        ctx.closePath();
        ctx.fillStyle = `rgba(255,255,255,${0.55 - t * 0.35})`;
        ctx.fill();
      }
    };

    const resize = () => {
      const rect = parent.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(rect.width * dpr);
      canvas.height = Math.floor(rect.height * dpr);
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      draw();
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(parent);
    return () => ro.disconnect();
  }, [progress, turnHint]);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 z-[5]"
      aria-hidden
    />
  );
}

export function MeterNavView({ plan }: { plan: FloorPlan }) {
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
  useEffect(() => {
    totalPxRef.current = totalPx;
  }, [totalPx]);

  const mpp =
    plan.metersPerPixel > 0 && plan.metersPerPixel !== 0.024
      ? plan.metersPerPixel
      : 0.01;

  const totalM = totalPx * mpp;
  const remainingM = Math.max(0, (totalPx - travelled) * mpp);
  const travelledM = travelled * mpp;
  const progress = totalPx > 0 ? Math.min(1, travelled / totalPx) : 0;
  const traveler = pathNodes.length ? pointAlongPath(pathNodes, travelled) : null;
  const arrived = remainingM < 0.5 && pathNodes.length > 0;

  const turnSteps = useMemo(() => getTurnInstructions(pathNodes), [pathNodes]);
  const activeStep: TurnStep | null = currentTurnStep(turnSteps, travelledM);
  const untilTurn = metersUntilNextTurn(turnSteps, travelledM);

  const targetBearing = traveler ? headingFor(traveler.from, traveler.to) : 0;
  const liveHeading = heading ?? simHeading;
  const arrowAngle = arrived ? 0 : signedDeg(targetBearing - liveHeading);

  const turnHint: "straight" | "left" | "right" =
    activeStep?.kind === "left"
      ? "left"
      : activeStep?.kind === "right"
        ? "right"
        : Math.abs(arrowAngle) < 25
          ? "straight"
          : arrowAngle > 0
            ? "right"
            : "left";

  useEffect(() => {
    targetBearingRef.current = targetBearing;
  }, [targetBearing]);
  useEffect(() => {
    liveHeadingRef.current = liveHeading;
  }, [liveHeading]);
  useEffect(() => {
    hasCompassRef.current = heading !== null;
  }, [heading]);
  useEffect(() => {
    if (traveler && heading === null) setSimHeading(traveler.heading);
  }, [traveler?.heading, heading, traveler]);

  function onOrientHandler(e: DeviceOrientationEvent) {
    const x = e as DeviceOrientationEvent & { webkitCompassHeading?: number };
    if (typeof x.webkitCompassHeading === "number") {
      setHeading(normDeg(x.webkitCompassHeading));
    } else if (typeof e.alpha === "number") {
      setHeading(normDeg(360 - e.alpha));
    }
  }

  function onMotionHandler(e: DeviceMotionEvent) {
    const acc = e.accelerationIncludingGravity || e.acceleration;
    if (!acc || acc.x === null) return;
    const mag = Math.sqrt(
      (acc.x || 0) ** 2 + (acc.y || 0) ** 2 + (acc.z || 0) ** 2,
    );
    filteredAccRef.current = filteredAccRef.current * 0.9 + mag * 0.1;
    const dynamic = mag - filteredAccRef.current;
    const now = Date.now();
    if (dynamic > STEP_THRESHOLD && now - lastStepRef.current > STEP_COOLDOWN_MS) {
      lastStepRef.current = now;
      setStepCount((c) => c + 1);
      const diff = hasCompassRef.current
        ? Math.abs(signedDeg(targetBearingRef.current - liveHeadingRef.current))
        : 0;
      const stepPx = STEP_LENGTH_M / mpp;
      const forward = diff <= 90;
      setTravelled((t) =>
        Math.max(
          0,
          Math.min(totalPxRef.current, t + (forward ? stepPx : -stepPx * 0.3)),
        ),
      );
    }
  }

  async function requestMotionAndAttach() {
    setSensorError(null);
    try {
      const DOE = DeviceOrientationEvent as unknown as {
        requestPermission?: () => Promise<string>;
      };
      const DME = DeviceMotionEvent as unknown as {
        requestPermission?: () => Promise<string>;
      };
      if (typeof DOE.requestPermission === "function") {
        const r = await DOE.requestPermission();
        if (r !== "granted") throw new Error("دسترسی قطب‌نما داده نشد");
      }
      if (typeof DME.requestPermission === "function") {
        const r = await DME.requestPermission();
        if (r !== "granted") throw new Error("دسترسی شتاب‌سنج داده نشد");
      }
    } catch (err) {
      setSensorError(err instanceof Error ? err.message : "خطای سنسور");
      return;
    }
    if (!motionAttachedRef.current) {
      window.addEventListener("deviceorientation", onOrientHandler, true);
      window.addEventListener("devicemotion", onMotionHandler, true);
      motionAttachedRef.current = true;
      setMotionActive(true);
    }
  }

  useEffect(() => {
    return () => {
      window.removeEventListener("deviceorientation", onOrientHandler, true);
      window.removeEventListener("devicemotion", onMotionHandler, true);
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!walking || arrived) {
      if (walkRef.current) cancelAnimationFrame(walkRef.current);
      walkRef.current = null;
      lastTs.current = null;
      if (arrived) setWalking(false);
      return;
    }
    const speedMps = 1.1;
    const tick = (ts: number) => {
      if (lastTs.current == null) lastTs.current = ts;
      const dt = Math.min(0.1, (ts - lastTs.current) / 1000);
      lastTs.current = ts;
      const stepPx = (speedMps * dt) / mpp;
      setTravelled((t) => Math.min(totalPx, t + stepPx));
      walkRef.current = requestAnimationFrame(tick);
    };
    walkRef.current = requestAnimationFrame(tick);
    return () => {
      if (walkRef.current) cancelAnimationFrame(walkRef.current);
    };
  }, [walking, arrived, totalPx, mpp]);

  async function openGuide(d: MapNode) {
    setDestination(d);
    setPhase("guide");
    setTravelled(0);
    setStepCount(0);
    setWalking(false);
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
    setPhase("pick");
    setDestination(null);
    setTravelled(0);
  }

  if (!originNode || destinationNodes.length === 0) {
    return (
      <div className="mx-auto max-w-md px-5 py-16 text-center">
        <MapPinned className="mx-auto size-8 text-primary" />
        <p className="mt-3 text-sm text-muted">
          نقشه مبدأ/مقصد ندارد. از تب «نقشه متری» یک JSON اعمال کن.
        </p>
      </div>
    );
  }

  if (phase === "pick") {
    return (
      <div className="mx-auto w-full max-w-lg px-3 pb-10 pt-4 sm:px-4">
        <h2 className="text-lg font-semibold tracking-tight">کجا می‌روید؟</h2>
        <p className="mt-1 mb-1 text-sm text-muted">
          نقشه: <span className="font-medium text-fg">{plan.mapName}</span>
        </p>
        <p className="mb-4 text-sm text-muted">
          مقصد را انتخاب کنید — دوربین باز می‌شود و مسیر سبز + دستور پیچ می‌آید.
        </p>
        <ul className="flex flex-col gap-2">
          {destinationNodes.map((d) => {
            const p = shortestPath(plan.nodes, plan.edges, originNode.id, d.id);
            const meters = pathLengthPx(p) * mpp;
            const turns = getTurnInstructions(p);
            const turnCount = turns.filter(
              (t) => t.kind === "left" || t.kind === "right",
            ).length;
            const reachable = p.length > 0;
            return (
              <li key={d.id}>
                <button
                  type="button"
                  onClick={() => reachable && openGuide(d)}
                  disabled={!reachable}
                  className="flex w-full items-center gap-3 rounded-2xl bg-surface-2 px-4 py-3.5 text-right shadow-[var(--shadow-border)] transition hover:shadow-[var(--shadow-border-hover)] disabled:opacity-40"
                >
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <MapPinned className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">
                      {d.name || d.id}
                    </span>
                    <span className="block text-xs text-muted tabular-nums">
                      {reachable
                        ? `${meters.toFixed(1)} متر · ${turnCount} پیچ`
                        : "مسیر وصل نیست"}
                    </span>
                  </span>
                  <Navigation className="size-4 shrink-0 text-muted" />
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    );
  }

  return (
    <div className="relative isolate min-h-[calc(100dvh-3.5rem)] overflow-hidden bg-black text-white">
      <video
        ref={videoRef}
        muted
        playsInline
        autoPlay
        className="pointer-events-none absolute inset-0 size-full object-cover"
        style={{ opacity: camReady ? 1 : 0.3 }}
      />
      {!camReady && (
        <div className="absolute inset-0 z-[1] grid place-items-center bg-black/70 text-sm text-white/80">
          در حال باز کردن دوربین…
        </div>
      )}

      <ArPathOverlay progress={progress} turnHint={turnHint} />

      <div className="relative z-10 mx-auto flex min-h-[calc(100dvh-3.5rem)] w-full max-w-3xl flex-col justify-between gap-2 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="flex items-center justify-between gap-2">
          <Button
            variant="secondary"
            size="sm"
            className="bg-black/50 text-white shadow-none hover:bg-black/70"
            onClick={exitGuide}
          >
            <ArrowRight className="rotate-180" />
            خروج
          </Button>
          <Badge className="border-0 bg-black/50 text-white">
            {arrived
              ? "رسیدید"
              : camReady
                ? `${remainingM.toFixed(1)} متر مانده`
                : "آماده‌سازی…"}
          </Badge>
        </div>

        <div className="flex flex-col items-center gap-2">
          {!arrived ? (
            <>
              <GuideArrow angle={arrowAngle} />
              <div className="max-w-xs rounded-2xl bg-black/55 px-4 py-2.5 text-center backdrop-blur">
                <p className="text-sm font-semibold">
                  {activeStep?.kind === "left"
                    ? "↰ به چپ بپیچید"
                    : activeStep?.kind === "right"
                      ? "↱ به راست بپیچید"
                      : Math.abs(arrowAngle) < 20
                        ? "مستقیم بروید"
                        : arrowAngle > 0
                          ? "به راست متمایل شوید"
                          : "به چپ متمایل شوید"}
                </p>
                <p className="mt-0.5 text-xs text-white/75">
                  {untilTurn > 0.4
                    ? `${untilTurn.toFixed(1)} متر تا دستور بعدی`
                    : activeStep?.instruction || "مسیر سبز را دنبال کنید"}
                </p>
              </div>
            </>
          ) : (
            <div className="rounded-2xl bg-emerald-500/90 px-6 py-4 text-center text-base font-semibold shadow-lg">
              به مقصد رسیدید
              <div className="mt-1 text-sm font-normal opacity-90">
                {destination?.name}
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <div className="ml-auto w-[28vw] max-w-[120px] overflow-hidden rounded-xl border border-white/25 bg-black/55 shadow-lg backdrop-blur-sm">
            <FloorCanvas
              plan={plan}
              path={pathNodes}
              travelledPx={travelled}
              interactive={false}
              showLabels={false}
              className="opacity-95"
            />
          </div>

          <div className="rounded-2xl bg-black/55 p-3 backdrop-blur-md">
            <div className="mb-2 flex items-center justify-between text-xs text-white/80">
              <span className="flex items-center gap-1.5">
                <Footprints className="size-3.5" />
                {motionActive ? `${stepCount} قدم` : "قدم‌شمار خاموش"}
              </span>
              <span className="tabular-nums">
                {destination?.name} · {totalM.toFixed(1)} متر
              </span>
            </div>

            <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-white/15">
              <div
                className="h-full rounded-full bg-emerald-400 transition-[width] duration-300"
                style={{ width: `${Math.round(progress * 100)}%` }}
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="secondary"
                className="bg-white/15 text-white shadow-none hover:bg-white/25"
                onClick={() => setWalking((w) => !w)}
                disabled={arrived}
              >
                {walking ? <Pause /> : <Play />}
                {walking ? "توقف دمو" : "شبیه‌سازی حرکت"}
              </Button>
              {!motionActive ? (
                <Button
                  variant="secondary"
                  className="bg-white/15 text-white shadow-none hover:bg-white/25"
                  onClick={requestMotionAndAttach}
                >
                  <Compass />
                  فعال‌سازی سنسور
                </Button>
              ) : (
                <div className="flex items-center justify-center rounded-2xl bg-white/10 text-xs text-white/80">
                  سنسور فعال
                </div>
              )}
            </div>

            {sensorError && (
              <p className="mt-2 text-center text-xs text-amber-200">{sensorError}</p>
            )}

            {heading === null && (
              <label className="mt-2 flex items-center gap-2 text-xs text-white/70">
                <Compass className="size-3.5 shrink-0" />
                <span className="w-12 tabular-nums">{Math.round(simHeading)}°</span>
                <input
                  type="range"
                  min={0}
                  max={359}
                  value={Math.round(simHeading)}
                  onChange={(e) => setSimHeading(Number(e.target.value))}
                  className="h-8 w-full accent-emerald-400"
                />
              </label>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
