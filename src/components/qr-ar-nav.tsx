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
// دیگه هیچ WebXR/SLAM اینجا نیست — فقط دوربین (برای پس‌زمینه‌ی تزئینی)،
// قطب‌نمای واقعیِ گوشی (برای جهت) و شتاب‌سنج (برای شمارش قدمِ واقعی).

function ArWalkScreen({ destination, onExit }: { destination: QrDestination; onExit: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [camReady, setCamReady] = useState(false);
  const [camError, setCamError] = useState(false);

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
      // اگه جهتِ واقعیِ قدم با جهتِ مقصد هم‌راستا بود، جلو؛ وگرنه (برگشتی) عقب
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

    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setCamReady(true);
      } catch {
        setCamError(true);
      }
    })();

    return () => {
      window.removeEventListener("deviceorientation", onOrient, true);
      window.removeEventListener("devicemotion", onMotion, true);
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function calibrateNow() {
    // کاربر همین الان رو به سمتِ مقصد ایستاده — همین جهت رو به‌عنوانِ هدف ثبت می‌کنیم
    const b = heading ?? 0;
    setTargetBearing(b);
    targetBearingRef.current = b;
    setCalibrated(true);
  }

  const arrowAngle = heading === null || targetBearing === null ? 0 : signedDiff(targetBearingRef.current - heading);

  return (
    <div className="relative min-h-dvh overflow-hidden bg-black text-white">
      <video ref={videoRef} muted playsInline className="absolute inset-0 size-full object-cover" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-black/40" />

      <div className="relative z-10 mx-auto flex min-h-dvh w-full max-w-md flex-col justify-between p-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(0.75rem,env(safe-area-inset-top))]">
        <div className="flex items-center justify-between">
          <Button variant="secondary" size="sm" onClick={onExit}>
            <ArrowRight className="rotate-180" />
            خروج
          </Button>
          <Badge variant="muted">
            {camError ? "دوربین در دسترس نیست" : camReady ? "دوربین فعال" : "..."} · {destination.name}
          </Badge>
        </div>

        {!calibrated ? (
          <div className="mx-auto max-w-xs space-y-3 text-center">
            <p className="rounded-xl bg-white/10 px-3 py-3 text-sm">
              رو به همون سمتی وایسا که <b>{destination.name}</b> اونجاست، بعد بزن «همینجا، همین جهت»
            </p>
            <Button className="w-full" onClick={calibrateNow}>
              <Compass />
              همینجا، همین جهت
            </Button>
          </div>
        ) : (
          <div className="text-center">
            <p className="text-5xl font-bold tabular-nums">{arrived ? "رسیدید" : `${remainingM.toFixed(1)} m`}</p>
            {!arrived && (
              <div
                className="mx-auto mt-4 text-6xl transition-transform duration-200 ease-out"
                style={{ transform: `rotate(${arrowAngle}deg)` }}
              >
                ↑
              </div>
            )}
            {arrived && <p className="mt-2 text-sm text-white/80">به {destination.name} رسیدید</p>}
          </div>
        )}

        <div className="space-y-2">
          {sensorError && <p className="rounded-xl bg-white/10 px-3 py-2 text-center text-xs">{sensorError}</p>}
          {!motionActive && (
            <Button variant="secondary" className="w-full" onClick={requestSensors}>
              <Compass />
              فعال‌سازی قطب‌نما و قدم‌شمار (iOS)
            </Button>
          )}
          <div className="rounded-xl bg-white/10 px-3 py-2 text-center text-xs">
            {motionActive ? `🚶 ${stepCount} قدم واقعی ثبت شد` : "قدم‌شمار هنوز فعال نشده"}
          </div>
        </div>
      </div>
    </div>
  );
}
