import { useMemo, useRef, useState } from "react";
import { Ruler, RotateCcw, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { FloorPlan } from "@/lib/floorplan/types";

type Point = { x: number; y: number };

export function MapScaleCalibration({
  plan,
  setPlan,
}: {
  plan: FloorPlan;
  setPlan: React.Dispatch<React.SetStateAction<FloorPlan>>;
}) {
  const imageRef = useRef<HTMLDivElement>(null);
  const [first, setFirst] = useState<Point | null>(null);
  const [second, setSecond] = useState<Point | null>(null);
  const [realDistance, setRealDistance] = useState("10");

  const pixelDistance = useMemo(() => {
    if (!first || !second) return 0;
    return Math.hypot(second.x - first.x, second.y - first.y);
  }, [first, second]);

  const metersPerPixel = useMemo(() => {
    const meters = Number(realDistance);
    if (!pixelDistance || !Number.isFinite(meters) || meters <= 0) return 0;
    return meters / pixelDistance;
  }, [realDistance, pixelDistance]);

  function handleMapClick(event: React.MouseEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * plan.imgDims.w;
    const y = ((event.clientY - rect.top) / rect.height) * plan.imgDims.h;
    const point = { x, y };

    if (!first || second) {
      setFirst(point);
      setSecond(null);
      return;
    }

    setSecond(point);
  }

  function saveScale() {
    if (!metersPerPixel) return;
    setPlan((current) => ({
      ...current,
      metersPerPixel,
    }));
  }

  function resetSelection() {
    setFirst(null);
    setSecond(null);
  }

  return (
    <section className="mx-auto mt-4 w-full max-w-3xl px-3 pb-8 sm:px-4">
      <div className="rounded-2xl bg-surface-2 p-4 shadow-[var(--shadow-border)]">
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Ruler className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold">کالیبراسیون اندازه واقعی نقشه</h3>
            <p className="mt-1 text-xs leading-5 text-muted">
              ادمین فقط یک‌بار دو نقطه با فاصله واقعی مشخص را روی نقشه انتخاب می‌کند.
              سیستم خودش مقیاس را حساب می‌کند؛ کاربر هیچ تنظیمی نمی‌بیند.
            </p>
          </div>
        </div>

        <div
          ref={imageRef}
          onClick={handleMapClick}
          className="relative mt-4 cursor-crosshair overflow-hidden rounded-xl border border-border bg-black/5 select-none"
        >
          <img
            src={plan.imgSrc}
            alt={plan.mapName}
            className="block h-auto w-full"
            draggable={false}
          />

          {first && (
            <span
              className="absolute size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-primary shadow"
              style={{ left: `${(first.x / plan.imgDims.w) * 100}%`, top: `${(first.y / plan.imgDims.h) * 100}%` }}
            />
          )}
          {second && (
            <span
              className="absolute size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-primary shadow"
              style={{ left: `${(second.x / plan.imgDims.w) * 100}%`, top: `${(second.y / plan.imgDims.h) * 100}%` }}
            />
          )}
          {first && second && (
            <svg className="pointer-events-none absolute inset-0 size-full" viewBox={`0 0 ${plan.imgDims.w} ${plan.imgDims.h}`} preserveAspectRatio="none">
              <line x1={first.x} y1={first.y} x2={second.x} y2={second.y} stroke="currentColor" strokeWidth="8" strokeLinecap="round" className="text-primary" />
            </svg>
          )}
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl bg-bg p-3">
            <p className="text-xs text-muted">فاصله روی نقشه</p>
            <p className="mt-1 font-semibold tabular-nums">{pixelDistance ? `${pixelDistance.toFixed(1)} px` : "—"}</p>
          </div>
          <label className="rounded-xl bg-bg p-3">
            <span className="block text-xs text-muted">فاصله واقعی</span>
            <div className="mt-1 flex items-center gap-2">
              <input
                value={realDistance}
                onChange={(e) => setRealDistance(e.target.value)}
                inputMode="decimal"
                min="0.1"
                step="0.1"
                type="number"
                className="h-9 w-full rounded-lg border border-border bg-surface-2 px-2 text-sm outline-none focus:border-primary"
              />
              <span className="text-xs text-muted">متر</span>
            </div>
          </label>
          <div className="rounded-xl bg-bg p-3">
            <p className="text-xs text-muted">مقیاس محاسبه‌شده</p>
            <p className="mt-1 font-semibold tabular-nums">
              {metersPerPixel ? `${metersPerPixel.toFixed(5)} m/px` : "—"}
            </p>
          </div>
        </div>

        <div className="mt-3 flex gap-2">
          <Button onClick={saveScale} disabled={!metersPerPixel} className="flex-1">
            <Save />
            ذخیره مقیاس
          </Button>
          <Button variant="secondary" onClick={resetSelection}>
            <RotateCcw />
            انتخاب مجدد
          </Button>
        </div>

        <p className="mt-3 text-center text-[11px] text-subtle">
          پیشنهاد: دو نقطه‌ای را انتخاب کنید که فاصله واقعی آن را دقیق می‌دانید؛ مثلاً دو سر یک راهروی ۱۰ متری.
        </p>
      </div>
    </section>
  );
}
