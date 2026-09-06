import type { Edge, FloorPlan, MapNode } from "./types";

/** Sample clinic raster is 1792×1008. Coordinates are pixel positions on that sheet. */
export const SAMPLE_MAP_SRC = "/maps/noor-clinic.jpg";
export const SAMPLE_DIMS = { w: 1792, h: 1008 } as const;
export const SAMPLE_METERS_PER_PX = 0.024;

function n(
  id: string,
  x: number,
  y: number,
  kind: MapNode["kind"],
  name: string,
): MapNode {
  return { id, x, y, kind, name };
}

/**
 * Pre-placed graph for کلینیک نور.
 * Origin at the south entrance QR; destinations sit in room centers;
 * waypoints sit in corridors / door throats so Dijkstra walks hallways, not walls.
 */
const nodes: MapNode[] = [
  n("o1", 896, 932, "origin", "ورودی اصلی"),

  n("d-em", 268, 148, "destination", "اورژانس"),
  n("d-rad", 700, 148, "destination", "رادیولوژی"),
  n("d-lab", 1094, 148, "destination", "آزمایشگاه"),
  n("d-us", 1522, 148, "destination", "سونوگرافی"),
  n("d-ph", 268, 454, "destination", "داروخانه"),
  n("d-re", 268, 670, "destination", "پذیرش"),
  n("d-e1", 1522, 424, "destination", "مطب داخلی"),
  n("d-e2", 1522, 570, "destination", "مطب اطفال"),
  n("d-wc", 1522, 710, "destination", "سرویس بهداشتی"),

  n("wp-ent", 896, 870, "waypoint", ""),
  n("wp-lobby-w", 500, 870, "waypoint", ""),
  n("wp-lobby-e", 1288, 870, "waypoint", ""),
  n("wp-wait-s", 896, 760, "waypoint", ""),
  n("wp-wait", 896, 564, "waypoint", ""),
  n("wp-wait-n", 896, 400, "waypoint", ""),
  n("wp-hall-c", 896, 308, "waypoint", ""),
  n("wp-hall-w", 500, 308, "waypoint", ""),
  n("wp-hall-e", 1288, 308, "waypoint", ""),
  n("wp-em", 268, 308, "waypoint", ""),
  n("wp-rad", 700, 308, "waypoint", ""),
  n("wp-lab", 1094, 308, "waypoint", ""),
  n("wp-us", 1522, 308, "waypoint", ""),
  n("wp-ph", 500, 454, "waypoint", ""),
  n("wp-re", 500, 670, "waypoint", ""),
  n("wp-e1", 1288, 424, "waypoint", ""),
  n("wp-e2", 1288, 570, "waypoint", ""),
  n("wp-wc", 1288, 710, "waypoint", ""),
];

const E = (a: string, b: string): Edge => [a, b];

const edges: Edge[] = [
  E("o1", "wp-ent"),
  E("wp-ent", "wp-lobby-w"),
  E("wp-ent", "wp-lobby-e"),
  E("wp-ent", "wp-wait-s"),
  E("wp-wait-s", "wp-wait"),
  E("wp-wait", "wp-wait-n"),
  E("wp-wait-n", "wp-hall-c"),
  E("wp-hall-c", "wp-hall-w"),
  E("wp-hall-c", "wp-hall-e"),
  E("wp-hall-w", "wp-em"),
  E("wp-em", "d-em"),
  E("wp-hall-w", "wp-rad"),
  E("wp-rad", "d-rad"),
  E("wp-hall-e", "wp-lab"),
  E("wp-lab", "d-lab"),
  E("wp-hall-e", "wp-us"),
  E("wp-us", "d-us"),
  E("wp-hall-w", "wp-ph"),
  E("wp-ph", "d-ph"),
  E("wp-ph", "wp-re"),
  E("wp-re", "d-re"),
  E("wp-re", "wp-lobby-w"),
  E("wp-wait", "wp-ph"),
  E("wp-wait", "wp-e2"),
  E("wp-hall-e", "wp-e1"),
  E("wp-e1", "d-e1"),
  E("wp-e1", "wp-e2"),
  E("wp-e2", "d-e2"),
  E("wp-e2", "wp-wc"),
  E("wp-wc", "d-wc"),
  E("wp-wc", "wp-lobby-e"),
];

export function samplePlan(): FloorPlan {
  return {
    version: 1,
    mapName: "کلینیک تخصصی نور · طبقه همکف",
    imgSrc: SAMPLE_MAP_SRC,
    imgDims: { w: SAMPLE_DIMS.w, h: SAMPLE_DIMS.h },
    metersPerPixel: SAMPLE_METERS_PER_PX,
    nodes: nodes.map((node) => ({ ...node })),
    edges: edges.map(([a, b]) => [a, b]),
    idCounter: 80,
  };
}

export function isSamplePlan(plan: FloorPlan) {
  return plan.imgSrc === SAMPLE_MAP_SRC;
}
