import { useEffect, useState } from "react";
import { Compass, Map } from "lucide-react";
import { Toaster } from "sonner";
import { EditView } from "@/components/edit-view";
import { NavigateView } from "@/components/navigate-view";
import { cn } from "@/lib/utils";
import type { FloorPlan } from "@/lib/floorplan/types";
import { samplePlan } from "@/lib/floorplan/sample";
import { loadPlan, savePlan } from "@/lib/floorplan/storage";

type Tab = "edit" | "navigate";

export function AppHome() {
  const [tab, setTab] = useState<Tab>("edit");
  const [plan, setPlan] = useState<FloorPlan>(() => samplePlan());
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setPlan(loadPlan());
    const params = new URLSearchParams(window.location.search);
    if (params.get("destination")) {
      setTab("navigate");
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    savePlan(plan);
  }, [plan, ready]);

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
        <nav className="mx-auto grid max-w-3xl grid-cols-2 px-3 sm:px-4" aria-label="بخش‌ها">
          {(
            [
              { key: "edit", label: "ویرایش نقشه", icon: Map },
              { key: "navigate", label: "ناوبری", icon: Compass },
            ] as const
          ).map(({ key, label, icon: Icon }) => {
            const active = tab === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setTab(key)}
                className={cn(
                  "relative flex h-12 items-center justify-center gap-2 text-sm transition-colors duration-[var(--motion-quick)]",
                  active ? "font-semibold text-primary" : "font-medium text-muted",
                )}
              >
                <Icon className="size-4" />
                {label}
                <span
                  className={cn(
                    "absolute inset-x-6 bottom-0 h-0.5 rounded-full bg-primary transition-opacity duration-[var(--motion-quick)]",
                    active ? "opacity-100" : "opacity-0",
                  )}
                />
              </button>
            );
          })}
        </nav>
      </header>

      {tab === "edit" ? <EditView plan={plan} setPlan={setPlan} /> : <NavigateView plan={plan} />}

      <Toaster
        position="bottom-center"
        dir="rtl"
        toastOptions={{
          className: "font-sans",
        }}
      />
    </div>
  );
}
