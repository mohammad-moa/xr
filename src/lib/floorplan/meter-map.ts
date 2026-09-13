/**
 * نقشهٔ داخلی بر اساس متر واقعی (بدون نیاز به عکس).
 * مختصات x/y مستقیم به متر هستند.
 * x مثبت = شرق ، y مثبت = شمال (بالای نقشه)
 */
import type { Edge, FloorPlan, MapNode, NodeKind } from "./types";
import { dist, headingFor, normDeg, signedDeg } from "./pathfinding";

export type MeterMapNode = {
  id: string;
  x: number;
  y: number;
  kind: NodeKind;
  name: string;
};

export type MeterMapJson = {
  version: 2;
  mapName: string;
  unit: "meters";
  nodes: MeterMapNode[];
  edges: [string, string][];
};

export type TurnKind = "start" | "straight" | "left" | "right" | "arrive";

export type TurnStep = {
  /** ایندکس گره روی مسیر که این دستور مربوط به آن است */
  atIndex: number;
  nodeId: string;
  nodeName: string;
  kind: TurnKind;
  /** فاصله از گره قبلی تا این گره (متر) */
  legMeters: number;
  /** فاصله تجمعی از مبدأ تا این گره (متر) */
  cumulativeMeters: number;
  /** متن فارسی برای UI */
  instruction: string;
  /** heading خروج از این گره به‌سمت بعدی (درجه، ۰=شمال) */
  headingDeg?: number;
};

const KIND_SET = new Set<NodeKind>(["origin", "destination", "waypoint"]);

/** اعتبارسنجی و پارس JSON نقشه متری */
export function parseMeterMapJson(input: unknown): MeterMapJson {
  if (!input || typeof input !== "object") {
    throw new Error("JSON نامعتبر است");
  }
  const raw = input as Record<string, unknown>;

  if (raw.unit !== "meters") {
    throw new Error('واحد باید "meters" باشد');
  }
  if (typeof raw.mapName !== "string" || !raw.mapName.trim()) {
    throw new Error("mapName الزامی است");
  }
  if (!Array.isArray(raw.nodes) || raw.nodes.length < 2) {
    throw new Error("حداقل ۲ نقطه (node) لازم است");
  }
  if (!Array.isArray(raw.edges) || raw.edges.length < 1) {
    throw new Error("حداقل ۱ اتصال (edge) لازم است");
  }

  const nodes: MeterMapNode[] = raw.nodes.map((n, i) => {
    const nn = n as Record<string, unknown>;
    if (typeof nn.id !== "string" || !nn.id) {
      throw new Error(`node[${i}]: id نامعتبر`);
    }
    if (typeof nn.x !== "number" || typeof nn.y !== "number") {
      throw new Error(`node[${i}] (${nn.id}): x و y باید عدد باشند (متر)`);
    }
    if (typeof nn.kind !== "string" || !KIND_SET.has(nn.kind as NodeKind)) {
      throw new Error(`node[${i}]: kind باید origin | destination | waypoint باشد`);
    }
    return {
      id: nn.id,
      x: nn.x,
      y: nn.y,
      kind: nn.kind as NodeKind,
      name: typeof nn.name === "string" ? nn.name : nn.id,
    };
  });

  const ids = new Set(nodes.map((n) => n.id));
  if (ids.size !== nodes.length) {
    throw new Error("idهای تکراری در nodes وجود دارد");
  }

  const origins = nodes.filter((n) => n.kind === "origin");
  if (origins.length !== 1) {
    throw new Error("دقیقاً یک origin لازم است");
  }

  const edges: [string, string][] = raw.edges.map((e, i) => {
    if (!Array.isArray(e) || e.length !== 2) {
      throw new Error(`edge[${i}] باید [idA, idB] باشد`);
    }
    const a = String(e[0]);
    const b = String(e[1]);
    if (!ids.has(a) || !ids.has(b)) {
      throw new Error(`edge[${i}]: نقطه ناشناخته ${a} یا ${b}`);
    }
    if (a === b) {
      throw new Error(`edge[${i}]: نمی‌تواند به خودش وصل شود`);
    }
    return [a, b];
  });

  return {
    version: 2,
    mapName: raw.mapName.trim(),
    unit: "meters",
    nodes,
    edges,
  };
}

export function parseMeterMapText(text: string): MeterMapJson {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error("متن JSON قابل خواندن نیست");
  }
  return parseMeterMapJson(data);
}

/**
 * تبدیل نقشه متری به FloorPlan داخلی پروژه.
 * چون واحد متر است، metersPerPixel = 1 و مختصات همان متر هستند.
 * imgSrc خالی می‌ماند — پلان از روی nodes رسم می‌شود.
 */
export function buildPlanFromMeterJson(map: MeterMapJson): FloorPlan {
  const xs = map.nodes.map((n) => n.x);
  const ys = map.nodes.map((n) => n.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  // حاشیه برای نمایش canvas (متر → همان واحد)
  const pad = 1.5;
  const widthM = Math.max(4, maxX - minX + pad * 2);
  const heightM = Math.max(4, maxY - minY + pad * 2);

  // برای سازگاری با FloorCanvas که با پیکسل کار می‌کند:
  // هر متر = 100 واحد نمایشی (فقط برای رندر SVG)
  const scale = 100;
  const nodes: MapNode[] = map.nodes.map((n) => ({
    id: n.id,
    x: (n.x - minX + pad) * scale,
    y: (maxY - n.y + pad) * scale, // y نقشه: شمال بالا → در SVG پایین‌تر = y بیشتر، پس معکوس
    kind: n.kind,
    name: n.name,
  }));

  const edges: Edge[] = map.edges.map(([a, b]) => [a, b]);

  return {
    version: 1,
    mapName: map.mapName,
    imgSrc: null,
    imgDims: { w: Math.round(widthM * scale), h: Math.round(heightM * scale) },
    // مهم: هر ۱ واحد نمایشی = 0.01 متر → metersPerPixel درست می‌شود
    metersPerPixel: 1 / scale,
    nodes,
    edges,
    idCounter: map.nodes.length + 1,
  };
}

/**
 * از روی مسیر (لیست گره‌ها) دستورهای پیچ مثل گوگل می‌سازد.
 * path باید خروجی shortestPath باشد.
 */
export function getTurnInstructions(path: MapNode[]): TurnStep[] {
  if (path.length === 0) return [];
  if (path.length === 1) {
    return [
      {
        atIndex: 0,
        nodeId: path[0]!.id,
        nodeName: path[0]!.name || path[0]!.id,
        kind: "arrive",
        legMeters: 0,
        cumulativeMeters: 0,
        instruction: `رسیدید به ${path[0]!.name || path[0]!.id}`,
      },
    ];
  }

  const steps: TurnStep[] = [];
  let cumulative = 0;

  // شروع
  const h0 = headingFor(path[0]!, path[1]!);
  steps.push({
    atIndex: 0,
    nodeId: path[0]!.id,
    nodeName: path[0]!.name || path[0]!.id,
    kind: "start",
    legMeters: 0,
    cumulativeMeters: 0,
    instruction: `از «${path[0]!.name || path[0]!.id}» شروع کنید — مستقیم بروید`,
    headingDeg: h0,
  });

  for (let i = 1; i < path.length; i++) {
    const prev = path[i - 1]!;
    const cur = path[i]!;
    const leg = dist(prev, cur);
    cumulative += leg;

    if (i === path.length - 1) {
      steps.push({
        atIndex: i,
        nodeId: cur.id,
        nodeName: cur.name || cur.id,
        kind: "arrive",
        legMeters: leg,
        cumulativeMeters: cumulative,
        instruction: `بعد از ${leg.toFixed(1)} متر به «${cur.name || cur.id}» می‌رسید`,
        headingDeg: headingFor(prev, cur),
      });
      break;
    }

    const next = path[i + 1]!;
    const turn = classifyTurn(prev, cur, next);
    const legTxt = leg.toFixed(1);
    let instruction: string;
    if (turn === "straight") {
      instruction = `بعد از ${legTxt} متر مستقیم ادامه دهید`;
    } else if (turn === "left") {
      instruction = `بعد از ${legTxt} متر به چپ بپیچید`;
    } else {
      instruction = `بعد از ${legTxt} متر به راست بپیچید`;
    }
    if (cur.name) {
      instruction += ` (نزدیک ${cur.name})`;
    }

    steps.push({
      atIndex: i,
      nodeId: cur.id,
      nodeName: cur.name || cur.id,
      kind: turn,
      legMeters: leg,
      cumulativeMeters: cumulative,
      instruction,
      headingDeg: headingFor(cur, next),
    });
  }

  return steps;
}

function classifyTurn(
  a: { x: number; y: number },
  b: { x: number; y: number },
  c: { x: number; y: number },
): "straight" | "left" | "right" {
  const inH = headingFor(a, b);
  const outH = headingFor(b, c);
  const delta = signedDeg(outH - inH);
  // کمتر از ~۲۵ درجه = مستقیم
  if (Math.abs(delta) < 25) return "straight";
  // در سیستم heading ما (ساعت‌گرد از شمال):
  // delta مثبت ≈ راست ، منفی ≈ چپ  (بسته به تعریف atan2 در headingFor)
  // headingFor: atan2(dx, -dy) → آزمایش: شرق از شمال = +90
  // پیچ از شمال به شرق = راست = delta مثبت
  return delta > 0 ? "right" : "left";
}

/** نزدیک‌ترین دستور پیچ نسبت به مسافت طی‌شده از مبدأ (متر) */
export function currentTurnStep(
  steps: TurnStep[],
  travelledMeters: number,
): TurnStep | null {
  if (steps.length === 0) return null;
  // آخرین stepی که cumulativeMeters <= travelled + آستانه
  let current = steps[0]!;
  for (const s of steps) {
    if (s.cumulativeMeters <= travelledMeters + 0.6) {
      current = s;
    } else {
      break;
    }
  }
  return current;
}

/** فاصله تا دستور بعدی (متر) */
export function metersUntilNextTurn(
  steps: TurnStep[],
  travelledMeters: number,
): number {
  for (const s of steps) {
    if (s.cumulativeMeters > travelledMeters + 0.3 && s.kind !== "start") {
      return Math.max(0, s.cumulativeMeters - travelledMeters);
    }
  }
  return 0;
}

/** نمونهٔ آماده برای UI */
export const HOME_EXAMPLE_JSON: MeterMapJson = {
  version: 2,
  mapName: "خانه نمونه",
  unit: "meters",
  nodes: [
    { id: "door-bedroom", x: 0, y: 0, kind: "origin", name: "درب اتاق خواب" },
    { id: "hall-1", x: 0, y: 2.5, kind: "waypoint", name: "راهرو ۱" },
    { id: "corner", x: 0, y: 5, kind: "waypoint", name: "پیچ راهرو" },
    { id: "hall-2", x: 2.5, y: 5, kind: "waypoint", name: "راهرو ۲" },
    { id: "kitchen", x: 5, y: 5, kind: "destination", name: "آشپزخانه" },
    { id: "living", x: 5, y: 2, kind: "destination", name: "پذیرایی" },
    { id: "bath", x: -2, y: 5, kind: "destination", name: "سرویس" },
  ],
  edges: [
    ["door-bedroom", "hall-1"],
    ["hall-1", "corner"],
    ["corner", "hall-2"],
    ["hall-2", "kitchen"],
    ["hall-2", "living"],
    ["corner", "bath"],
  ],
};
