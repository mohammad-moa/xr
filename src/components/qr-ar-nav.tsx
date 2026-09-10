import { useEffect, useRef, useState } from "react";
import { ArrowRight, Compass, MapPinned, QrCode, ScanLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

/**
 * یه فلوی کاملاً ساده و مستقل، جدا از سیستم نقشه‌ی پیکسلی و جدا از WebXR/SLAM:
 *   ۱) کاربر یه QR اسکن می‌کنه (یا برای تست، داده‌ی نمونه رو بارگذاری می‌کنه)
 *   ۲) از توی QR، لیست مقصدها (هرکدوم با فاصله‌ی واقعیِ متری) درمیاد
 *   ۳) کاربر یکی رو انتخاب می‌کنه
 *   ۴) دوربین باز می‌شه؛ یه پیکانِ AR روی تصویر، بر اساسِ قطب‌نمای واقعیِ گوشی
 *      می‌چرخه و مسیر رو نشون می‌ده؛ فاصله هم از روی قدمِ واقعی (شتاب‌سنج)
 *      کم می‌شه.
 *
 * چرا این‌جوری، نه WebXR/SLAM؟
 *   SLAM (ردیابیِ کاملِ سه‌بعدی) ذاتاً شکننده‌ست — نیاز به نورِ خوب، تکون
 *   دقیق، و چند ثانیه initialize داره، حتی توی اپ‌های نیتیو. قطب‌نما+قدم‌شمار
 *   هیچ‌کدومِ این مشکلات رو نداره، روی iOS هم کار می‌کنه (WebXR فقط اندروید
 *   بود)، و صد‌درصد با APIهای استانداردِ خودِ مرورگره — بدون هیچ سرویسِ بیرونی.
 *
 * فرمتِ داده‌ی داخلِ QR (یه رشته‌ی JSON):
 *   {
 *     "origin": "ورودی",
 *     "destinations": [
 *       { "name": "اتاق ۱۰۲", "distanceMeters": 4, "bearingDeg": 90 }
 *     ]
 *   }
 * bearingDeg اختیاریه (جهتِ قطب‌نماییِ مقصد نسبت به شمال، ۰-۳۵۹). اگه ندی،
 * فرض می‌کنیم کاربر همون لحظه‌ی شروع، رو به مقصده (کالیبراسیونِ دستی).
 */

type QrDestination = { name: string; distanceMeters: number; bearingDeg?: number };
type QrPayload = { origin?: string; destinations: QrDestination[] };

const SAMPLE_PAYLOAD: QrPayload = {
  origin: "ورودی",
  destinations: [
    { name: "پذیرش", distanceMeters: 4 },
    { name: "اتاق معاینه", distanceMeters: 7 },
  ],
};

const STEP_LENGTH_M = 0.75;
const STEP_THRESHOLD = 1.6;
const STEP_COOLDOWN_MS = 300;

const norm = (n: number) => ((n % 360) + 360) % 360;
const signedDiff = (n: number) => {
  const x = norm(n);
  return x > 180 ? x - 360 : x;
};

function parseQrPayload(text: string): QrPayload | null {
  try {
    const data = JSON.parse(text);
    if (!Array.isArray(data?.destinations)) return null;
    const destinations = data.destinations
      .filter((d: unknown): d is QrDestination => {
        const dd = d as Partial<QrDestination>;
        return typeof dd?.name === "string" && typeof dd?.distanceMeters === "number" && dd.distanceMeters > 0;
      })
      .map((d: QrDestination) => ({
        name: d.name,
        distanceMeters: d.distanceMeters,
        bearingDeg: typeof d.bearingDeg === "number" ? norm(d.bearingDeg) : undefined,
      }));
    if (destinations.length === 0) return null;
    return { origin: typeof data.origin === "string" ? data.origin : undefined, destinations };
  } catch {
    return null;
  }
}

type Phase = "scan" | "pick" | "ar";

export function QrArNav() {
  const [phase, setPhase] = useState<Phase>("scan");
  const [payload, setPayload] = useState<QrPayload | null>(null);
  const [destination, setDestination] = useState<QrDestination | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [manualText, setManualText] = useState("");

  return (
    <div className="min-h-dvh bg-bg text-fg">
      {phase === "scan" && (
        <ScanScreen
          onDecoded={(p) => {
            setPayload(p);
            setScanError(null);
            setPhase("pick");
          }}
          error={scanError}
          setError={setScanError}
          manualText={manualText}
          setManualText={setManualText}
          onUseSample={() => {
            setPayload(SAMPLE_PAYLOAD);
            setPhase("pick");
          }}
        />
      )}
      {phase === "pick" && payload && (
        <PickScreen
          payload={payload}
          onBack={() => setPhase("scan")}
          onPick={(d) => {
            setDestination(d);
            setPhase("ar");
          }}
        />
      )}
      {phase === "ar" && destination && (
        <ArWalkScreen destination={destination} onExit={() => setPhase("pick")} />
      )}
    </div>
  );
}

// ---------------------------------------------------------------- Scan ----

function ScanScreen({
  onDecoded,
  error,
  setError,
  manualText,
  setManualText,
  onUseSample,
}: {
  onDecoded: (p: QrPayload) => void;
  error: string | null;
  setError: (e: string | null) => void;
  manualText: string;
  setManualText: (s: string) => void;
  onUseSample: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [camOn, setCamOn] = useState(false);
  const [detectorSupported, setDetectorSupported] = useState(true);

  useEffect(() => {
    setDetectorSupported("BarcodeDetector" in window);
  }, []);

  useEffect(() => {
    let stopped = false;
    let timer: number | null = null;

    async function start() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        });
        if (stopped) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setCamOn(true);

        if ("BarcodeDetector" in window) {
          const Detector = (window as unknown as { BarcodeDetector: new (o: { formats: string[] }) => {
            detect: (src: CanvasImageSource) => Promise<Array<{ rawValue: string }>>;
          } }).BarcodeDetector;
          const detector = new Detector({ formats: ["qr_code"] });
          const loop = async () => {
            if (stopped || !videoRef.current) return;
            try {
              const codes = await detector.detect(videoRef.current);
              if (codes.length > 0) {
                const parsed = parseQrPayload(codes[0].rawValue);
                if (parsed) {
                  onDecoded(parsed);
                  return;
                }
                setError("این QR فرمت درستی نداره — یه QR دیگه رو امتحان کن یا از «دادهٔ نمونه» استفاده کن.");
              }
            } catch {
              /* یه فریم رو رد کن، فریم بعدی رو امتحان کن */
            }
            timer = window.setTimeout(loop, 200);
          };
          loop();
        }
      } catch {
        setError("دسترسی به دوربین رد شد یا ممکن نیست.");
      }
    }
    start();

    return () => {
      stopped = true;
      if (timer) window.clearTimeout(timer);
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="relative min-h-dvh overflow-hidden bg-black text-white">
      <video ref={videoRef} muted playsInline className="absolute inset-0 size-full object-cover opacity-80" />
      <div className="relative z-10 mx-auto flex min-h-dvh w-full max-w-md flex-col justify-between p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="flex items-center gap-2 pt-[max(0.75rem,env(safe-area-inset-top))]">
          <ScanLine className="size-5" />
          <p className="text-sm font-semibold">اسکنِ QR مسیر</p>
        </div>

        <div className="mx-auto aspect-square w-64 rounded-3xl border-2 border-white/70" />

        <div className="space-y-3">
          <p className="text-center text-xs text-white/80">
            {!camOn
              ? "در حال باز کردنِ دوربین..."
              : !detectorSupported
                ? "این مرورگر QR رو خودکار نمی‌خونه — از «دادهٔ نمونه» یا ورودِ دستی استفاده کن."
                : "QR رو داخل کادر بگیر"}
          </p>
          {error && <p className="rounded-xl bg-white/10 px-3 py-2 text-center text-xs">{error}</p>}

          <Button className="w-full" onClick={onUseSample}>
            <QrCode />
            استفاده از دادهٔ نمونه (بدون QR واقعی)
          </Button>

          <details className="rounded-xl bg-white/10 p-3 text-xs">
            <summary className="cursor-pointer select-none">ورودِ دستیِ JSON (برای تست)</summary>
            <textarea
              value={manualText}
              onChange={(e) => setManualText(e.target.value)}
              placeholder='{"origin":"ورودی","destinations":[{"name":"اتاق ۱۰۲","distanceMeters":4}]}'
              className="mt-2 h-24 w-full rounded-lg bg-black/40 p-2 text-xs text-white outline-none"
              dir="ltr"
            />
            <Button
              variant="secondary"
              className="mt-2 w-full"
              onClick={() => {
                const parsed = parseQrPayload(manualText);
                if (parsed) onDecoded(parsed);
                else setError("این متن JSON معتبر نیست.");
              }}
            >
              تایید
            </Button>
          </details>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- Pick ----

function PickScreen({
  payload,
  onBack,
  onPick,
}: {
  payload: QrPayload;
  onBack: () => void;
  onPick: (d: QrDestination) => void;
}) {
  return (
    <div className="mx-auto min-h-dvh w-full max-w-md p-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))]">
      <div className="mb-4 flex items-center gap-2">
        <Button variant="secondary" size="sm" onClick={onBack}>
          <ArrowRight className="rotate-180" />
        </Button>
        <div>
          <p className="text-sm font-semibold">کجا می‌ری؟</p>
          {payload.origin && <p className="text-xs text-muted">مبدأ: {payload.origin}</p>}
        </div>
      </div>
      <div className="space-y-2">
        {payload.destinations.map((d) => (
          <button
            key={d.name}
            onClick={() => onPick(d)}
            className="flex w-full items-center justify-between rounded-2xl border border-border bg-surface px-4 py-3.5 text-right"
          >
            <span className="flex items-center gap-2 text-sm font-medium">
              <MapPinned className="size-4 text-primary" />
              {d.name}
            </span>
            <Badge variant="muted">{d.distanceMeters} m</Badge>
          </button>
        ))}
      </div>
    </div>
  );
}

// -------------------------------------------------------------- AR walk ----
// نسخه‌ی «گوگلی»: بدون دوربین به‌عنوان صفحه‌ی اصلی — دقیقاً مثل ناوبریِ
// پیاده‌ی خودِ گوگل‌مپ که هیچ AR/دوربینی نداره، فقط نقشه‌ی بالا-به-پایین +
// پیکانِ جهت‌دار + کارتِ بالا/پایین. موقعیت هنوز از همون قطب‌نما + شتاب‌سنجِ
// واقعیِ قبلی میاد (SLAM/دوربین هیچ‌وقت اینجا نبود)، فقط حالا به‌جای اورلی
// روی تصویرِ دوربین، روی یه نقشه‌ی شماتیکِ ساده (خط از مبدأ تا مقصد) رسم
// می‌شه — که هم پایدارتره، هم بصری‌ش به چیزی که کاربرا باهاش آشنان نزدیک‌تره.

const COMPASS_LABELS = ["شمال", "شمال‌شرق", "شرق", "جنوب‌شرق", "جنوب", "جنوب‌غرب", "غرب", "شمال‌غرب"];
function compassLabel(bearingDeg: number) {
  const idx = Math.round(norm(bearingDeg) / 45) % 8;
  return COMPASS_LABELS[idx];
}

function SchematicMap({ progress, arrowAngle }: { progress: number; arrowAngle: number }) {
  // progress: 0 (مبدأ) تا 1 (مقصد). یه مسیرِ ساده‌ی عمودی رسم می‌کنیم چون از
  // QR فقط فاصله (و شاید جهت) داریم، نه هندسه‌ی واقعیِ راهرو — دقیقاً مثل
  // خیلی از اپ‌های "پیدا کردن ماشین" که مسیر رو خطی و ساده نشون می‌دن.
  const y = 260 - progress * 200;
  return (
    <svg viewBox="0 0 200 280" className="mx-auto h-64 w-full max-w-[220px]">
      <line x1="100" y1="260" x2="100" y2="60" stroke="currentColor" strokeWidth="10" strokeLinecap="round" className="text-border" />
      <line x1="100" y1="260" x2="100" y2={y} stroke="currentColor" strokeWidth="10" strokeLinecap="round" className="text-primary" />
      <circle cx="100" cy="260" r="7" fill="currentColor" className="text-muted" />
      <g transform={`translate(100,60)`}>
        <circle r="11" fill="currentColor" className="text-primary" />
        <circle r="11" fill="none" stroke="white" strokeWidth="2.5" />
      </g>
      <g transform={`translate(100,${y}) rotate(${arrowAngle})`}>
        <circle r="16" fill="currentColor" className="text-primary opacity-15" />
        <path d="M0,-11 L7,7 L0,3 L-7,7 Z" fill="currentColor" className="text-primary" stroke="white" strokeWidth="2" />
      </g>
    </svg>
  );
}

function ArWalkScreen({ destination, onExit }: { destination: QrDestination; onExit: () => void }) {
  const [heading, setHeading] = useState<number | null>(null);
  const [motionActive, setMotionActive] = useState(false);
  const [sensorError, setSensorError] = useState<string | null>(null);
  const [stepCount, setStepCount] = useState(0);
  const [remainingM, setRemainingM] = useState(destination.distanceMeters);
  const [targetBearing, setTargetBearing] = useState<number | null>(destination.bearingDeg ?? null);
  const [calibrated, setCalibrated] = useState(destination.bearingDeg !== undefined);

  const filteredAccRef = useRef(9.8);
  const lastStepRef = useRef(0);
  const motionAttachedRef = useRef(false);
  const headingRef = useRef(0);
  const targetBearingRef = useRef(destination.bearingDeg ?? 0);
  const remainingRef = useRef(destination.distanceMeters);

  const arrived = remainingM < 0.4;
  const totalM = destination.distanceMeters;
  const progress = totalM > 0 ? Math.min(1, Math.max(0, (totalM - remainingM) / totalM)) : 0;
  const etaMin = Math.max(1, Math.round(((remainingM / 1.2) / 60) * 10) / 10);

  useEffect(() => { headingRef.current = heading ?? 0; }, [heading]);
  useEffect(() => { if (targetBearing !== null) targetBearingRef.current = targetBearing; }, [targetBearing]);

  function onOrient(e: DeviceOrientationEvent) {
    const x = e as DeviceOrientationEvent & { webkitCompassHeading?: number };
    if (typeof x.webkitCompassHeading === "number") setHeading(norm(x.webkitCompassHeading));
    else if (typeof e.alpha === "number") setHeading(norm(360 - e.alpha));
  }

  function onMotion(e: DeviceMotionEvent) {
    const acc = e.accelerationIncludingGravity || e.acceleration;
    if (!acc || acc.x === null) return;
    const mag = Math.sqrt((acc.x || 0) ** 2 + (acc.y || 0) ** 2 + (acc.z || 0) ** 2);
    filteredAccRef.current = filteredAccRef.current * 0.9 + mag * 0.1;
    const dynamic = mag - filteredAccRef.current;
    const now = Date.now();
    if (dynamic > STEP_THRESHOLD && now - lastStepRef.current > STEP_COOLDOWN_MS) {
      lastStepRef.current = now;
      setStepCount((c) => c + 1);
      const diff = Math.abs(signedDiff(targetBearingRef.current - headingRef.current));
      const forward = diff <= 90;
      remainingRef.current = Math.max(0, remainingRef.current + (forward ? -STEP_LENGTH_M : STEP_LENGTH_M));
      setRemainingM(remainingRef.current);
    }
  }

  async function requestSensors() {
    if (motionAttachedRef.current) return;
    try {
      const DOE = window.DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> };
      const DME = window.DeviceMotionEvent as unknown as { requestPermission?: () => Promise<string> };
      if (typeof DOE?.requestPermission === "function") {
        const res = await DOE.requestPermission();
        if (res !== "granted") { setSensorError("اجازه‌ی دسترسی به قطب‌نما داده نشد."); return; }
      }
      if (typeof DME?.requestPermission === "function") {
        const res = await DME.requestPermission();
        if (res !== "granted") { setSensorError("اجازه‌ی دسترسی به شتاب‌سنج داده نشد."); return; }
      }
      window.addEventListener("deviceorientation", onOrient, true);
      window.addEventListener("devicemotion", onMotion, true);
      motionAttachedRef.current = true;
      setMotionActive(true);
      setSensorError(null);
    } catch {
      setSensorError("این مرورگر به حسگرهای حرکتی دسترسی نمی‌دهد.");
    }
  }

  useEffect(() => {
    const DOE = typeof window !== "undefined"
      ? (window.DeviceOrientationEvent as unknown as { requestPermission?: unknown })
      : undefined;
    if (DOE && typeof DOE.requestPermission !== "function") {
      window.addEventListener("deviceorientation", onOrient, true);
      window.addEventListener("devicemotion", onMotion, true);
      motionAttachedRef.current = true;
      setMotionActive(true);
    }
    return () => {
      window.removeEventListener("deviceorientation", onOrient, true);
      window.removeEventListener("devicemotion", onMotion, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function calibrateNow() {
    const b = heading ?? 0;
    setTargetBearing(b);
    targetBearingRef.current = b;
    setCalibrated(true);
  }

  const arrowAngle = heading === null || targetBearing === null ? 0 : signedDiff(targetBearingRef.current - heading);

  if (!calibrated) {
    return (
      <div className="flex min-h-dvh flex-col justify-between bg-bg p-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(0.75rem,env(safe-area-inset-top))] text-fg">
        <Button variant="secondary" size="sm" onClick={onExit} className="w-fit">
          <ArrowRight className="rotate-180" />
          خروج
        </Button>
        <div className="mx-auto max-w-xs space-y-3 text-center">
          <p className="rounded-2xl border border-border bg-surface px-4 py-4 text-sm">
            رو به همون سمتی وایسا که <b>{destination.name}</b> اونجاست، بعد بزن «همینجا، همین جهت»
          </p>
          <Button className="w-full" onClick={calibrateNow}>
            <Compass />
            همینجا، همین جهت
          </Button>
        </div>
        <div />
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col bg-neutral-100 text-fg">
      {/* کارتِ بالا، دقیقاً به سبکِ گوگل‌مپ: جهتِ قطب‌نمایی + پیکان */}
      <div
        className="rounded-b-2xl bg-primary px-4 pb-4 shadow-lg"
        style={{ paddingTop: "max(0.9rem, env(safe-area-inset-top))" }}
      >
        <div className="mb-2 flex items-center justify-between">
          <Button variant="secondary" size="sm" onClick={onExit}>
            <ArrowRight className="rotate-180" />
          </Button>
          <span className="text-xs text-white/85">{destination.name}</span>
        </div>
        <div className="flex items-center gap-3 text-white">
          <div className="text-3xl transition-transform duration-200 ease-out" style={{ transform: `rotate(${arrowAngle}deg)` }}>
            ↑
          </div>
          <p className="text-xl font-bold">
            {arrived ? "رسیدید به مقصد" : `به سمت ${compassLabel(targetBearingRef.current)} بروید`}
          </p>
        </div>
      </div>

      {/* نقشه‌ی شماتیک — جای اورلیِ دوربین */}
      <div className="flex flex-1 flex-col items-center justify-center px-4">
        <SchematicMap progress={progress} arrowAngle={arrowAngle} />
        {sensorError && <p className="mt-2 rounded-xl bg-white px-3 py-2 text-center text-xs text-muted shadow">{sensorError}</p>}
        {!motionActive && (
          <Button variant="secondary" className="mt-2" onClick={requestSensors}>
            <Compass />
            فعال‌سازی قطب‌نما و قدم‌شمار (iOS)
          </Button>
        )}
      </div>

      {/* نوارِ پایین، دقیقاً به سبکِ گوگل‌مپ: زمانِ تخمینی + فاصله */}
      <div
        className="rounded-t-2xl bg-white px-4 pt-3 shadow-[0_-4px_14px_rgba(0,0,0,0.08)]"
        style={{ paddingBottom: "max(0.9rem, env(safe-area-inset-bottom))" }}
      >
        <div className="flex items-center justify-between">
          <div className="text-xs text-muted">🚶 {motionActive ? `${stepCount} قدم` : "قدم‌شمار خاموش"}</div>
          <div className="text-center">
            <p className="text-2xl font-bold tabular-nums">{arrived ? "رسیدید" : `${etaMin} دقیقه`}</p>
            <p className="text-xs text-muted">{arrived ? destination.name : `${remainingM.toFixed(0)} m`}</p>
          </div>
          <div className="w-16" />
        </div>
      </div>
    </div>
  );
}
