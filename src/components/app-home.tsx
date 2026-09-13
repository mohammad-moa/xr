import { useEffect, useState } from "react";
import { Compass, Map, Ruler, ScanLine } from "lucide-react";
import { Toaster } from "sonner";
import { EditView } from "@/components/edit-view";
import { NavigateView } from "@/components/navigate-view";
import { QrArNav } from "@/components/qr-ar-nav";
import { MeterMapEditor } from "@/components/meter-map-editor";
import { MeterNavView } from "@/components/meter-nav-view";
import { cn } from "@/lib/utils";
import type { FloorPlan } from "@/lib/floorplan/types";
import { samplePlan } from "@/lib/floorplan/sample";
import { loadPlan, savePlan } from "@/lib/floorplan/storage";
import {
  HOME_EXAMPLE_JSON,
  buildPlanFromMeterJson,
} from "@/lib/floorplan/meter-map";

type Tab = "edit" | "meter" | "navigate" | "qr";

function initialPlan(): FloorPlan {
  try {
    // پیش‌فرض: خانهٔ نمونه متری (با پیچ) — برای دموی کارفرما
    return buildPlanFromMeterJson(HOME_EXAMPLE_JSON);
  } catch {
    return samplePlan();
  }
}

export function AppHome() {
  const [tab, setTab] = useState<Tab>("meter");
  const [plan, setPlan] = useState<FloorPlan>(initialPlan);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const loaded = loadPlan();
    // اگر نقشهٔ ذخیره‌شده مقیاس خراب قدیمی داشت، خانهٔ نمونه را بگذار
    if (loaded.metersPerPixel === 0.024 || loaded.nodes.length === 0) {
      setPlan(initialPlan());
    } else {
      setPlan(loaded);
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    savePlan(plan);
  }, [plan, ready]);

  if (tab === "qr") {
    return (
      <>
        <button
          type="button"
          onClick={() => setTab("meter")}
          className="fixed left-3 top-[max(0.75rem,env(safe-area-inset-top))] z-30 rounded-full bg-black/40 px-3 py-1.5 text-xs text-white"
        >
          پنل ادمین
        </button>
        <QrArNav />
      </>
    );
  }

  return (
    <div className="min-h-dvh bg-bg text-fg">
      <header className="sticky top-0 z-20 border-b border-border/80 bg-surface-2/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-3 pt-[max(0.5rem,env(safe-area-inset-top))] pb-0 sm:px-4">
          <div className="flex items-center gap-2.5 py-2">
            <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-fg">
              <Compass className="size-4" />
            </span>
            <div>
              <p className="text-sm font-semibold leading-tight">راهیاب</p>
              <p className="text-[11px] text-muted">ناوبری داخل ساختمان</p>
            </div>
          </div>
        </div>
        <nav
          className="mx-auto grid max-w-3xl grid-cols-4 px-1 sm:px-4"
          aria-label="بخش‌ها"
        >
          {(
            [
              { key: "meter", label: "نقشه متری", icon: Ruler },
              { key: "navigate", label: "ناوبری", icon: Compass },
              { key: "edit", label: "ویرایش", icon: Map },
              { key: "qr", label: "QR کاربر", icon: ScanLine },
            ] as const
          ).map(({ key, label, icon: Icon }) => {
            const active = tab === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setTab(key)}
                className={cn(
                  "relative flex h-12 items-center justify-center gap-1.5 text-[11px] sm:text-sm transition-colors",
                  active ? "font-semibold text-primary" : "font-medium text-muted",
                )}
              >
                <Icon className="size-3.5 sm:size-4" />
                <span className="truncate">{label}</span>
                <span
                  className={cn(
                    "absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-primary transition-opacity",
                    active ? "opacity-100" : "opacity-0",
                  )}
                />
              </button>
            );
          })}
        </nav>
      </header>

      {tab === "meter" && (
        <MeterMapEditor
          onApplyPlan={(next) => {
            setPlan(next);
            setTab("navigate");
          }}
        />
      )}
      {tab === "edit" && <EditView plan={plan} setPlan={setPlan} />}
      {tab === "navigate" && <MeterNavView plan={plan} />}

      <Toaster
        position="bottom-center"
        dir="rtl"
        toastOptions={{ className: "font-sans" }}
      />
    </div>
  );
}
