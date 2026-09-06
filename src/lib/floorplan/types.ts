export type NodeKind = "origin" | "destination" | "waypoint";

export type MapNode = {
  id: string;
  x: number;
  y: number;
  kind: NodeKind;
  name: string;
};

export type Edge = [string, string];

export type FloorPlan = {
  version: 1;
  mapName: string;
  imgSrc: string | null;
  imgDims: { w: number; h: number };
  metersPerPixel: number;
  nodes: MapNode[];
  edges: Edge[];
  idCounter: number;
};

export const KIND_LABEL: Record<NodeKind, string> = {
  origin: "مبدأ",
  destination: "مقصد",
  waypoint: "مسیر",
};

export function emptyPlan(): FloorPlan {
  return {
    version: 1,
    mapName: "نقشه سفارشی",
    imgSrc: null,
    imgDims: { w: 1600, h: 900 },
    metersPerPixel: 0.024,
    nodes: [],
    edges: [],
    idCounter: 1,
  };
}
