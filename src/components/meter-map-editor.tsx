/**
 * ویرایشگر سادهٔ نقشه متری با JSON.
 * کاربر بدون عکس، فقط با متر، خانه/کلینیک خودش را تعریف می‌کند.
 */
import { useMemo, useState } from "react";
import { Check, Map as MapIcon, Navigation, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FloorCanvas } from "@/components/floor-canvas";
import type { FloorPlan, MapNode } from "@/lib/floorplan/types";
import { shortestPath, pathLengthPx } from "@/lib/floorplan/pathfinding";
import {
  HOME_EXAMPLE_JSON,
  buildPlanFromMeterJson,
  getTurnInstructions,
  parseMeterMapText,
  type MeterMapJson,
  type TurnStep,
} from "@/lib/floorplan/meter-map";

type Props = {
  /** وقتی نقشه اعمال شد، plan پروژه را عوض کن */
  onApplyPlan: (plan: FloorPlan, source: MeterMapJson) => void;
};

const EXAMPLE_TEXT = JSON.stringify(HOME_EXAMPLE_JSON, null, 2);

export function MeterMapEditor({ onApplyPlan }: Props) {
  const [text, setText] = useState(EXAMPLE_TEXT);
  const [error, setError] = useState<string | null>(null);
  const [plan, setPlan] = useState<FloorPlan | null>(() => {
    try {
      return buildPlanFromMeterJson(HOME_EXAMPLE_JSON);
    } catch {
      return null;
    }
  });
  const [meterMap, setMeterMap] = useState<MeterMapJson | null>(HOME_EXAMPLE_JSON);
  const [destId, setDestId] = useState<string>("kitchen");

  const origin = plan?.nodes.find((n) => n.kind === "origin") ?? null;
  const destinations = plan?.nodes.filter((n) => n.kind === "destination") ?? [];

  const path: MapNode[] = useMemo(() => {
    if (!plan || !origin || !destId) return [];
    return shortestPath(plan.nodes, plan.edges, origin.id, destId);
  }, [plan, origin, destId]);

  const steps: TurnStep[] = useMemo(() => getTurnInstructions(path), [path]);
  const totalM =
    plan && path.length > 1 ? pathLengthPx(path) * plan.metersPerPixel : 0;

  function handleParse() {
    try {
      const map = parseMeterMapText(text);
      const next = buildPlanFromMeterJson(map);
      setMeterMap(map);
      setPlan(next);
      setError(null);
      const firstDest = next.nodes.find((n) => n.kind === "destination");
      if (firstDest) setDestId(firstDest.id);
      toast.success(`نقشه «${map.mapName}» بارگذاری شد`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "خطای ناشناخته";
      setError(msg);
      toast.error(msg);
    }
  }

  function handleApply() {
    if (!plan || !meterMap) {
      toast.error("اول JSON را بررسی کن");
      return;
    }
    onApplyPlan(plan, meterMap);
    toast.success("نقشه روی برنامه اعمال شد — برو تب ناوبری");
  }

  function loadExample() {
    setText(EXAMPLE_TEXT);
    setError(null);
    const next = buildPlanFromMeterJson(HOME_EXAMPLE_JSON);
    setMeterMap(HOME_EXAMPLE_JSON);
    setPlan(next);
    setDestId("kitchen");
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-3 py-4 sm:px-4">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">نقشه با متر (بدون عکس)</h2>
        <p className="mt-1 text-sm text-muted">
          مختصات به متر هستند. مبدأ را (۰,۰) بگذار، بقیه نقاط را نسبت به آن متر کن.
          x = شرق ، y = شمال.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="secondary" size="sm" onClick={loadExample}>
          <RotateCcw className="size-4" />
          نمونه خانه
        </Button>
        <Button type="button" size="sm" onClick={handleParse}>
          <Check className="size-4" />
          بررسی JSON
        </Button>
        <Button type="button" size="sm" onClick={handleApply} disabled={!plan}>
          <MapIcon className="size-4" />
          اعمال روی برنامه
        </Button>
      </div>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        spellCheck={false}
        className="min-h-[220px] w-full rounded-xl border border-border bg-surface-2 p-3 font-mono text-xs leading-relaxed text-fg outline-none focus:ring-2 focus:ring-primary/40"
        dir="ltr"
        placeholder='{ "version": 2, "mapName": "...", "unit": "meters", "nodes": [...], "edges": [...] }'
      />

      {error && (
        <p className="rounded-xl bg-red-500/10 px-3 py-2 text-sm text-red-600">{error}</p>
      )}

      {plan && (
        <>
          <div className="overflow-hidden rounded-2xl bg-surface-2 p-2 shadow-[var(--shadow-border)]">
            <div className="mb-2 flex items-center justify-between px-1">
              <span className="text-sm font-medium">{plan.mapName}</span>
              <Badge variant="muted" className="tabular-nums">
                {plan.nodes.length} نقطه · واحد متر
              </Badge>
            </div>
            <div className="overflow-hidden rounded-xl bg-bg outline outline-1 -outline-offset-1 outline-fg/10">
              <FloorCanvas plan={plan} path={path} travelledPx={0} interactive={false} />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs text-muted">مقصد آزمایشی</label>
            <select
              value={destId}
              onChange={(e) => setDestId(e.target.value)}
              className="w-full rounded-xl border border-border bg-surface-2 px-3 py-2.5 text-sm"
            >
              {destinations.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name || d.id}
                </option>
              ))}
            </select>
          </div>

          {steps.length > 0 && (
            <div className="rounded-2xl bg-surface-2 p-3">
              <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                <Navigation className="size-4 text-primary" />
                دستورهای مسیر
                <span className="text-xs font-normal text-muted tabular-nums">
                  ({totalM.toFixed(1)} متر)
                </span>
              </div>
              <ol className="flex flex-col gap-1.5">
                {steps.map((s, i) => (
                  <li
                    key={`${s.nodeId}-${i}`}
                    className="flex items-start gap-2 rounded-lg bg-bg/60 px-3 py-2 text-sm"
                  >
                    <span className="mt-0.5 size-5 shrink-0 rounded-full bg-primary/15 text-center text-[11px] font-semibold leading-5 text-primary">
                      {i + 1}
                    </span>
                    <span>
                      <TurnBadge kind={s.kind} />{" "}
                      {s.instruction}
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </>
      )}

      <details className="rounded-xl bg-surface-2 p-3 text-xs text-muted">
        <summary className="cursor-pointer font-medium text-fg">راهنمای نوشتن نقشه</summary>
        <ul className="mt-2 list-disc space-y-1 pr-4 leading-relaxed">
          <li>یک نقطه با kind: "origin" (مبدأ / محل ایستادن اول)</li>
          <li>مقصدها kind: "destination"</li>
          <li>پیچ‌ها و وسط راهرو kind: "waypoint"</li>
          <li>x و y به متر نسبت به مبدأ (مثلاً ۳ متر جلو = y: 3)</li>
          <li>edges فقط id دو نقطه را جفت می‌کند</li>
        </ul>
      </details>
    </div>
  );
}

function TurnBadge({ kind }: { kind: TurnStep["kind"] }) {
  const label =
    kind === "left"
      ? "↰ چپ"
      : kind === "right"
        ? "↱ راست"
        : kind === "straight"
          ? "↑ مستقیم"
          : kind === "arrive"
            ? "◉ رسیدید"
            : "● شروع";
  return (
    <span className="inline-block rounded bg-primary/10 px-1.5 py-0.5 text-[11px] font-semibold text-primary">
      {label}
    </span>
  );
}
