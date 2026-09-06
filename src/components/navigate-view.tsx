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

type Phase = "pick" | "preview" | "guide";

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

  // شمارش قدم واقعی از روی شتاب‌سنج گوشی (devicemotion)
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
      setTravelled((t) => Math.min(totalPxRef.current, t + STEP_LENGTH_M / plan.metersPerPixel));
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
    return () => {
      window.removeEventListener("deviceorientation", onOrientHandler, true);
      window.removeEventListener("devicemotion", onMotionHandler, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

      <div className="relative z-10 mx-auto flex min-h-[calc(100dvh-3.5rem)] w-full max-w-3xl flex-col justify-between gap-3 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
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
            {camReady ? "دوربین فعال" : "پیش‌نمایش مسیر"}
          </Badge>
        </div>

        <div className="overflow-hidden rounded-2xl bg-nav-fg/6 p-1.5">
          <div className="overflow-hidden rounded-xl">
            <FloorCanvas
              plan={plan}
              path={pathNodes}
              travelledPx={travelled}
              interactive={false}
            />
          </div>
        </div>

        <div className="flex flex-col items-center text-center">
          <p className="text-4xl font-semibold tabular-nums tracking-tight">
            {arrived ? "رسیدید" : `${remainingM.toFixed(0)} m`}
          </p>
          <GuideArrow angle={arrowAngle} />
          <p className="mt-1 rounded-full bg-nav-fg/12 px-3 py-1 text-xs tabular-nums">
            {arrived
              ? `به ${destination?.name ?? ""} رسیدید`
              : heading === null
                ? `شبیه‌ساز قطب‌نما · بخش ${traveler?.legIndex ?? 0}/${Math.max(1, pathNodes.length - 1)}`
                : `بخش ${traveler?.legIndex ?? 0}/${Math.max(1, pathNodes.length - 1)}`}
          </p>
        </div>

        <div className="space-y-2">
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
          {!motionActive && (
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
          {heading === null && (
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
