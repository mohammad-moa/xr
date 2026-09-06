import { useRef, useState, type Dispatch, type PointerEvent, type SetStateAction } from "react";
import {
  Download,
  Link2,
  MapPin,
  QrCode,
  RotateCcw,
  Trash2,
  Upload,
  Waypoints,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { FloorCanvas } from "@/components/floor-canvas";
import { cn } from "@/lib/utils";
import { emptyPlan, KIND_LABEL, type FloorPlan, type MapNode, type NodeKind } from "@/lib/floorplan/types";
import { samplePlan } from "@/lib/floorplan/sample";
import { clearSavedPlan } from "@/lib/floorplan/storage";

type Mode = "addOrigin" | "addDestination" | "addWaypoint" | "connect" | "delete";

const MODES: { key: Mode; label: string; icon: typeof MapPin }[] = [
  { key: "addOrigin", label: "مبدأ QR", icon: QrCode },
  { key: "addDestination", label: "مقصد", icon: MapPin },
  { key: "addWaypoint", label: "نقطه مسیر", icon: Waypoints },
  { key: "connect", label: "اتصال", icon: Link2 },
  { key: "delete", label: "حذف", icon: Trash2 },
];

export function EditView({
  plan,
  setPlan,
}: {
  plan: FloorPlan;
  setPlan: Dispatch<SetStateAction<FloorPlan>>;
}) {
  const [mode, setMode] = useState<Mode>("addWaypoint");
  const [connectFrom, setConnectFrom] = useState<string | null>(null);
  const [editingNode, setEditingNode] = useState<string | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const jsonRef = useRef<HTMLInputElement>(null);
  const originExists = plan.nodes.some((n) => n.kind === "origin");

  function handleUpload(file: File | undefined) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const src = ev.target?.result as string;
      const img = new Image();
      img.onload = () => {
        setPlan({
          ...emptyPlan(),
          mapName: file.name.replace(/\.[^.]+$/, "") || "نقشه سفارشی",
          imgSrc: src,
          imgDims: { w: img.naturalWidth, h: img.naturalHeight },
        });
        setConnectFrom(null);
        toast.success("نقشه بارگذاری شد. حالا مبدأ و مقصدها را بگذارید.");
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
  }

  function addNode(x: number, y: number) {
    if (mode === "connect" || mode === "delete") return;
    const kind: NodeKind =
      mode === "addOrigin" ? "origin" : mode === "addDestination" ? "destination" : "waypoint";
    if (kind === "origin" && originExists) {
      toast.error("فقط یک مبدأ مجاز است.");
      return;
    }
    const id = "n" + plan.idCounter;
    const node: MapNode = { id, x, y, kind, name: "" };
    setPlan({ ...plan, nodes: [...plan.nodes, node], idCounter: plan.idCounter + 1 });
    if (kind !== "waypoint") setEditingNode(id);
  }

  function handleMapPointer(pt: { x: number; y: number }, e: PointerEvent) {
    if (dragging) return;
    if (e.pointerType === "mouse" && e.button !== 0) return;
    addNode(pt.x, pt.y);
  }

  function handleNodePointer(node: MapNode, e: PointerEvent) {
    e.stopPropagation();
    if (mode === "delete") {
      setPlan((prev) => ({
        ...prev,
        nodes: prev.nodes.filter((n) => n.id !== node.id),
        edges: prev.edges.filter(([a, b]) => a !== node.id && b !== node.id),
      }));
      return;
    }
    if (mode === "connect") {
      if (!connectFrom) setConnectFrom(node.id);
      else if (connectFrom === node.id) setConnectFrom(null);
      else {
        setPlan((prev) => {
          const exists = prev.edges.some(
            ([a, b]) =>
              (a === connectFrom && b === node.id) || (a === node.id && b === connectFrom),
          );
          if (exists) return prev;
          return { ...prev, edges: [...prev.edges, [connectFrom, node.id]] };
        });
        setConnectFrom(null);
      }
      return;
    }
    setDragging(node.id);
    const startX = e.clientX;
    const startY = e.clientY;
    let moved = false;
    const onMove = (ev: globalThis.PointerEvent) => {
      const svg = (e.currentTarget as SVGGElement).ownerSVGElement;
      if (!svg) return;
      const ctm = svg.getScreenCTM();
      if (!ctm) return;
      if (Math.hypot(ev.clientX - startX, ev.clientY - startY) > 8) moved = true;
      const pt = svg.createSVGPoint();
      pt.x = ev.clientX;
      pt.y = ev.clientY;
      const loc = pt.matrixTransform(ctm.inverse());
      const x = Math.round(Math.min(plan.imgDims.w, Math.max(0, loc.x)));
      const y = Math.round(Math.min(plan.imgDims.h, Math.max(0, loc.y)));
      setPlan((prev) => ({
        ...prev,
        nodes: prev.nodes.map((n) => (n.id === node.id ? { ...n, x, y } : n)),
      }));
    };
    const onUp = () => {
      setDragging(null);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      if (!moved && node.kind !== "waypoint") setEditingNode(node.id);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  function updateNodeName(id: string, name: string) {
    setPlan({ ...plan, nodes: plan.nodes.map((n) => (n.id === id ? { ...n, name } : n)) });
  }

  function exportJSON() {
    const origin = plan.nodes.find((n) => n.kind === "origin");
    const data = {
      mapName: plan.mapName,
      imageSize: plan.imgDims,
      metersPerPixel: plan.metersPerPixel,
      origin: origin
        ? { id: origin.id, name: origin.name || "مبدأ", x: origin.x, y: origin.y }
        : null,
      destinations: plan.nodes
        .filter((n) => n.kind === "destination")
        .map((n) => ({ id: n.id, name: n.name || n.id, x: n.x, y: n.y })),
      routeNodes: plan.nodes
        .filter((n) => n.kind === "waypoint")
        .map((n) => ({ id: n.id, x: n.x, y: n.y })),
      edges: plan.edges,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "map.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  function importJSON(file: File | undefined) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result)) as {
          mapName?: string;
          imageSize?: { w: number; h: number };
          metersPerPixel?: number;
          origin?: { id: string; name: string; x: number; y: number } | null;
          destinations?: { id: string; name: string; x: number; y: number }[];
          routeNodes?: { id: string; x: number; y: number }[];
          edges?: [string, string][];
          nodes?: MapNode[];
        };
        const importedNodes: MapNode[] = data.nodes
          ? data.nodes
          : [
              ...(data.origin
                ? [
                    {
                      id: data.origin.id,
                      x: data.origin.x,
                      y: data.origin.y,
                      kind: "origin" as const,
                      name: data.origin.name,
                    },
                  ]
                : []),
              ...(data.destinations ?? []).map((d) => ({
                ...d,
                kind: "destination" as const,
              })),
              ...(data.routeNodes ?? []).map((d) => ({
                ...d,
                kind: "waypoint" as const,
                name: "",
              })),
            ];
        setPlan({
          ...plan,
          mapName: data.mapName || plan.mapName,
          imgDims: data.imageSize || plan.imgDims,
          metersPerPixel: data.metersPerPixel ?? plan.metersPerPixel,
          nodes: importedNodes,
          edges: data.edges ?? plan.edges,
          idCounter: importedNodes.length + 10,
        });
        toast.success("مختصات از JSON بارگذاری شد.");
      } catch {
        toast.error("فایل JSON نامعتبر است.");
      }
    };
    reader.readAsText(file);
  }

  const hint =
    mode === "connect"
      ? connectFrom
        ? "حالا نقطه‌ی دوم را بزنید"
        : "روی اولین نقطه بزنید تا وصل شود"
      : mode === "delete"
        ? "روی نقطه‌ای بزنید که حذف شود"
        : "روی نقشه بزنید تا نقطه اضافه شود · بکشید تا جابه‌جا شود";

  const labeled = plan.nodes.filter((n) => n.kind !== "waypoint");

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-3 px-3 pb-10 pt-3 sm:px-4">
      <div className="rounded-2xl bg-surface-2 p-4 shadow-[var(--shadow-border)]">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-medium tracking-wide text-muted">نقشه فعال</p>
            <h2 className="text-base font-semibold">{plan.mapName}</h2>
            <p className="mt-1 text-xs text-subtle">
              {plan.imgDims.w} × {plan.imgDims.h}px · مقیاس {plan.metersPerPixel} m/px
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" onClick={() => fileRef.current?.click()}>
              <Upload />
              آپلود نقشه
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                clearSavedPlan();
                setPlan(samplePlan());
                setConnectFrom(null);
                toast.success("نقشه نمونه کلینیک نور بارگذاری شد.");
              }}
            >
              <RotateCcw />
              نمونه پیش‌فرض
            </Button>
          </div>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            handleUpload(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
        <input
          ref={jsonRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => {
            importJSON(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
      </div>

      {!plan.imgSrc ? (
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="rounded-2xl border border-dashed border-border bg-surface-2 px-4 py-12 text-center shadow-[var(--shadow-border)]"
        >
          <Upload className="mx-auto size-6 text-primary" />
          <p className="mt-3 text-sm font-medium">برای آپلود نقشه (PNG / JPG) اینجا بزنید</p>
          <p className="mt-1 text-xs text-muted">یا از دکمه «نمونه پیش‌فرض» استفاده کنید</p>
        </button>
      ) : (
        <>
          <div className="flex flex-col gap-1.5">
            <div className="flex flex-wrap gap-1.5">
              {MODES.map(({ key, label, icon: Icon }) => {
                const disabled = key === "addOrigin" && originExists;
                const active = mode === key;
                return (
                  <Button
                    key={key}
                    type="button"
                    size="sm"
                    disabled={disabled}
                    variant={active ? "default" : "secondary"}
                    onClick={() => {
                      setMode(key);
                      setConnectFrom(null);
                    }}
                    className={cn(key === "delete" && active && "bg-danger text-danger-fg")}
                  >
                    <Icon />
                    {label}
                  </Button>
                );
              })}
            </div>
            <div className="flex flex-wrap gap-1.5">
              <Button variant="secondary" size="sm" onClick={() => jsonRef.current?.click()}>
                JSON ورودی
              </Button>
              <Button variant="outline" size="sm" onClick={exportJSON}>
                <Download />
                دانلود JSON
              </Button>
            </div>
          </div>

          <p className="text-xs text-muted">{hint}</p>

          <div className="overflow-hidden rounded-2xl bg-surface-2 p-2 shadow-[var(--shadow-border)]">
            <div className="overflow-hidden rounded-xl outline outline-1 -outline-offset-1 outline-fg/10">
              <FloorCanvas
                plan={plan}
                highlightId={connectFrom}
                onMapPointer={handleMapPointer}
                onNodePointer={handleNodePointer}
                className={mode === "connect" || mode === "delete" ? "cursor-pointer" : "cursor-crosshair"}
              />
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-muted">
            <span>
              {plan.nodes.length} نقطه · {plan.edges.length} اتصال
            </span>
            <span className="flex gap-1.5">
              <Badge variant="origin">مبدأ</Badge>
              <Badge variant="dest">مقصد</Badge>
              <Badge variant="way">مسیر</Badge>
            </span>
          </div>

          <section className="rounded-2xl bg-surface-2 p-4 shadow-[var(--shadow-border)]">
            <h3 className="mb-3 text-sm font-semibold">مختصات نقاط</h3>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[22rem] text-right text-sm">
                <thead className="text-xs text-muted">
                  <tr className="border-b border-border">
                    <th className="py-2 font-medium">نام</th>
                    <th className="py-2 font-medium">نوع</th>
                    <th className="py-2 font-medium tabular-nums">X</th>
                    <th className="py-2 font-medium tabular-nums">Y</th>
                  </tr>
                </thead>
                <tbody>
                  {labeled.map((n) => (
                    <tr key={n.id} className="border-b border-border/70 last:border-0">
                      <td className="py-2 font-medium">{n.name || "—"}</td>
                      <td className="py-2 text-muted">{KIND_LABEL[n.kind]}</td>
                      <td className="py-2 tabular-nums text-muted">{n.x}</td>
                      <td className="py-2 tabular-nums text-muted">{n.y}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-xs text-subtle">
              مختصات نسبت به گوشه بالا-چپ نقشه است (پیکسل). مبدأ را جایی بگذارید که QR نصب می‌شود.
            </p>
          </section>
        </>
      )}

      <Dialog open={!!editingNode} onOpenChange={(o) => !o && setEditingNode(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>نام‌گذاری نقطه</DialogTitle>
            <DialogDescription>مثلاً رادیولوژی یا ورودی اصلی</DialogDescription>
          </DialogHeader>
          <Input
            autoFocus
            placeholder="نام نقطه"
            defaultValue={plan.nodes.find((n) => n.id === editingNode)?.name || ""}
            onChange={(e) => editingNode && updateNodeName(editingNode, e.target.value)}
          />
          <Button className="mt-3 w-full" onClick={() => setEditingNode(null)}>
            تأیید
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
