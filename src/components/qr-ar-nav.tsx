import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, MapPinned, QrCode, ScanLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

/**
 * یه فلوی کاملاً ساده و مستقل، جدا از سیستم نقشه‌ی پیکسلی:
 *   ۱) کاربر یه QR اسکن می‌کنه (یا برای تست، داده‌ی نمونه رو بارگذاری می‌کنه)
 *   ۲) از توی QR، لیست مقصدها (هرکدوم با فاصله‌ی واقعیِ متری) درمیاد
 *   ۳) کاربر یکی رو انتخاب می‌کنه
 *   ۴) دوربین باز می‌شه و یه خط سبزِ راست، دقیقاً به‌اندازه‌ی همون فاصله‌ی
 *      واقعی، روی زمین رسم می‌شه — بدون هیچ نقشه‌ی پیکسلی، بدون قطب‌نما،
 *      بدون metersPerPixel. فقط متر واقعیِ خودِ WebXR.
 *
 * فرمتِ داده‌ی داخلِ QR (یه رشته‌ی JSON):
 *   { "origin": "ورودی", "destinations": [{ "name": "اتاق ۱۰۲", "distanceMeters": 4 }] }
 */

type QrDestination = { name: string; distanceMeters: number };
type QrPayload = { origin?: string; destinations: QrDestination[] };

const SAMPLE_PAYLOAD: QrPayload = {
  origin: "ورودی",
  destinations: [
    { name: "پذیرش", distanceMeters: 4 },
    { name: "اتاق معاینه", distanceMeters: 7 },
  ],
};

type XRSessionLike = {
  end: () => Promise<void>;
  requestAnimationFrame: (cb: (t: number, frame: unknown) => number | void) => number;
  updateRenderState: (state: Record<string, unknown>) => void;
  requestReferenceSpace: (type: string) => Promise<unknown>;
  addEventListener: (type: string, cb: () => void) => void;
};

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
    transform: { position: { x: number; y: number; z: number }; matrix: Float32Array };
    views: Array<{ projectionMatrix: Float32Array; transform: { inverse: { matrix: Float32Array } } }>;
  } | null;
};

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
 * یه نوارِ راست، به‌اندازه‌ی distanceMeters، رو به جهتِ واقعیِ گوشی در لحظه‌ای
 * که ردیابی قفل شد (نه لحظه‌ی زدنِ دکمه — چون بینِ این دو، به‌خاطر تکون‌دادنِ
 * گوشی برای فعال‌سازیِ ردیابی، جهتش عوض شده). forward باید یه بردارِ افقیِ
 * یکه (طول ۱، فقط x/z) باشه.
 */
function buildStraightLineVertices(
  start: { x: number; y: number; z: number },
  forward: { x: number; z: number },
  distanceMeters: number,
  halfWidthM = 0.09,
): Float32Array {
  const floorY = start.y - 1.2;
  const a = { x: start.x, y: floorY, z: start.z };
  const b = { x: start.x + forward.x * distanceMeters, y: floorY, z: start.z + forward.z * distanceMeters };
  // عمود بر جهتِ حرکت، توی صفحه‌ی افقی (چرخشِ ۹۰ درجه‌ی بردار جلو)
  const perpX = -forward.z * halfWidthM;
  const perpZ = forward.x * halfWidthM;
  const a1 = [a.x - perpX, a.y, a.z - perpZ];
  const a2 = [a.x + perpX, a.y, a.z + perpZ];
  const b1 = [b.x - perpX, b.y, b.z - perpZ];
  const b2 = [b.x + perpX, b.y, b.z + perpZ];
  return new Float32Array([...a1, ...a2, ...b1, ...a2, ...b2, ...b1]);
}

function parseQrPayload(text: string): QrPayload | null {
  try {
    const data = JSON.parse(text);
    if (!Array.isArray(data?.destinations)) return null;
    const destinations = data.destinations
      .filter((d: unknown): d is QrDestination => {
        const dd = d as Partial<QrDestination>;
        return typeof dd?.name === "string" && typeof dd?.distanceMeters === "number" && dd.distanceMeters > 0;
      })
      .map((d: QrDestination) => ({ name: d.name, distanceMeters: d.distanceMeters }));
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

function ArWalkScreen({ destination, onExit }: { destination: QrDestination; onExit: () => void }) {
  const [arSupported, setArSupported] = useState<boolean | null>(null);
  const [remainingM, setRemainingM] = useState<number | null>(null);
  const [arError, setArError] = useState<string | null>(null);
  const [arHint, setArHint] = useState<string | null>(null);
  const [started, setStarted] = useState(false);
  const sessionRef = useRef<XRSessionLike | null>(null);
  const startPosRef = useRef<{ x: number; y: number; z: number } | null>(null);
  const startForwardRef = useRef<{ x: number; z: number } | null>(null);
  const noPoseSinceRef = useRef<number | null>(null);
  const lastUpdateRef = useRef(0);
  const lineRef = useRef<{
    gl: WebGLRenderingContext;
    program: WebGLProgram;
    posLoc: number;
    mvpLoc: WebGLUniformLocation | null;
    colorLoc: WebGLUniformLocation | null;
    vbo: WebGLBuffer | null;
    vertexCount: number;
  } | null>(null);

  const arrived = remainingM !== null && remainingM < 0.4;

  useEffect(() => {
    const xr = (navigator as unknown as { xr?: { isSessionSupported: (m: string) => Promise<boolean> } }).xr;
    if (xr?.isSessionSupported) {
      xr.isSessionSupported("immersive-ar").then(setArSupported).catch(() => setArSupported(false));
    } else {
      setArSupported(false);
    }
    return () => {
      sessionRef.current?.end().catch(() => {});
    };
  }, []);

  async function start() {
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
      lineRef.current = {
        gl,
        program,
        posLoc: gl.getAttribLocation(program, "aPos"),
        mvpLoc: gl.getUniformLocation(program, "uMVP"),
        colorLoc: gl.getUniformLocation(program, "uColor"),
        vbo: gl.createBuffer(),
        vertexCount: 0,
      };

      const session = await xr.requestSession("immersive-ar", { requiredFeatures: ["local"] });
      sessionRef.current = session;
      setStarted(true);
      const XRWebGLLayerCtor = (window as unknown as { XRWebGLLayer: new (s: unknown, g: unknown) => unknown })
        .XRWebGLLayer;
      session.updateRenderState({ baseLayer: new XRWebGLLayerCtor(session, gl) });
      const refSpace = await session.requestReferenceSpace("local");

      startPosRef.current = null;
      startForwardRef.current = null;
      noPoseSinceRef.current = null;
      setArHint(null);
      setRemainingM(null);

      const onFrame = (_t: number, frame: unknown) => {
        session.requestAnimationFrame(onFrame);
        try {
          const f = frame as XRFrameLike;
          const pose = f.getViewerPose(refSpace);
          if (!pose) {
            if (noPoseSinceRef.current === null) {
              noPoseSinceRef.current = performance.now();
              // از همون لحظه‌ی اول راهنما رو نشون بده، منتظر گیرکردن نمون
              setArHint("گوشی رو آروم و پیوسته تکون بده (نه بچرخون)، رو به یه‌جای روشن و پرجزئیات — چند ثانیه طول می‌کشه");
            } else if (performance.now() - noPoseSinceRef.current > 8000) {
              setArHint("هنوز ردیابی پیدا نشد — نور محیط رو بیشتر کن یا رو به یه سطحِ دیگه (نه دیوارِ خالی/براق) بگیر");
            }
            return;
          }
          noPoseSinceRef.current = null;
          setArHint(null);
          const p = pose.transform.position;

          if (!startPosRef.current) {
            startPosRef.current = { x: p.x, y: p.y, z: p.z };
            // جهتِ واقعیِ «جلو»ی گوشی رو همین الان (نه لحظه‌ی زدنِ دکمه) از
            // ماتریسِ pose می‌گیریم — چون تا همین‌جا، برای فعال‌سازیِ ردیابی
            // گوشی رو تکون دادی و جهتش عوض شده. ستونِ سومِ ماتریس (اندیس‌های
            // ۸،۹،۱۰) محورِ Z محلیِ گوشیه؛ جلو = منفیِ همون، روی صفحه‌ی افقی.
            const m = pose.transform.matrix;
            const fx = -m[8];
            const fz = -m[10];
            const len = Math.hypot(fx, fz) || 1;
            startForwardRef.current = { x: fx / len, z: fz / len };

            const line = lineRef.current;
            if (line) {
              const verts = buildStraightLineVertices(startPosRef.current, startForwardRef.current, destination.distanceMeters);
              line.gl.bindBuffer(line.gl.ARRAY_BUFFER, line.vbo);
              line.gl.bufferData(line.gl.ARRAY_BUFFER, verts, line.gl.STATIC_DRAW);
              line.vertexCount = verts.length / 3;
            }
            return;
          }

          const line = lineRef.current;
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
            lgl.uniform4f(colorLoc, 0.16, 0.9, 0.45, 0.9);
            for (const view of pose.views) {
              const vp = baseLayer.getViewport(view);
              lgl.viewport(vp.x, vp.y, vp.width, vp.height);
              const mvp = mat4Multiply(view.projectionMatrix, view.transform.inverse.matrix);
              lgl.uniformMatrix4fv(mvpLoc, false, mvp);
              lgl.drawArrays(lgl.TRIANGLES, 0, line.vertexCount);
            }
          }

          const now = performance.now();
          if (now - lastUpdateRef.current < 100) return;
          lastUpdateRef.current = now;

          // جلو = محور -Z محلی؛ هرچی جلوتر بری، z کوچیک‌تر (منفی‌تر) می‌شه
          // پیشرفت = فاصله‌ای که واقعاً توی همون جهتِ «جلو»ی کالیبره‌شده جلو رفتی
          const fwd = startForwardRef.current ?? { x: 0, z: -1 };
          const progress = (p.x - startPosRef.current.x) * fwd.x + (p.z - startPosRef.current.z) * fwd.z;
          setRemainingM(Math.max(0, destination.distanceMeters - progress));
        } catch (err) {
          setArError((prev) => prev ?? (err instanceof Error ? `خطای رندر: ${err.message}` : "خطای نامشخص"));
        }
      };
      session.requestAnimationFrame(onFrame);
      session.addEventListener("end", () => {
        sessionRef.current = null;
        lineRef.current = null;
        setStarted(false);
      });
    } catch (err) {
      setArError(err instanceof Error ? err.message : "شروع AR ناموفق بود.");
    }
  }

  return (
    <div className="relative min-h-dvh bg-black text-white">
      <div className="relative z-10 mx-auto flex min-h-dvh w-full max-w-md flex-col justify-between p-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(0.75rem,env(safe-area-inset-top))]">
        <div className="flex items-center justify-between">
          <Button variant="secondary" size="sm" onClick={onExit}>
            <ArrowRight className="rotate-180" />
            خروج
          </Button>
          <Badge variant="muted">{destination.name}</Badge>
        </div>

        {arSupported === false && (
          <p className="mx-auto max-w-xs rounded-xl bg-white/10 px-3 py-2 text-center text-xs">
            این گوشی/مرورگر از AR واقعی پشتیبانی نمی‌کنه (فقط Chrome روی اندروید با ARCore).
          </p>
        )}

        <div className="text-center">
          <p className="text-5xl font-bold tabular-nums">
            {arrived ? "رسیدید" : remainingM === null ? "—" : `${remainingM.toFixed(1)} m`}
          </p>
          {arrived && <p className="mt-2 text-sm text-white/80">به {destination.name} رسیدید</p>}
        </div>

        <div className="space-y-2">
          {arError && <p className="rounded-xl bg-white/10 px-3 py-2 text-center text-xs">{arError}</p>}
          {arHint && <p className="rounded-xl bg-amber-500/25 px-3 py-2 text-center text-xs">{arHint}</p>}
          {arSupported && !started && (
            <>
              <p className="rounded-xl bg-amber-500/15 px-3 py-2 text-center text-xs">
                قبل از زدنِ دکمه، رو به همون طرفی وایسا که قراره راه بری.
              </p>
              <Button className="w-full" onClick={start}>
                شروعِ AR واقعی
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
