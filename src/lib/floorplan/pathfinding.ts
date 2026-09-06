import type { Edge, MapNode } from "./types";

export function dist(a: { x: number; y: number }, b: { x: number; y: number }) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/** Compass heading in degrees: 0 = north (up on the map), clockwise. */
export function headingFor(a: { x: number; y: number }, b: { x: number; y: number }) {
  return ((Math.atan2(b.x - a.x, -(b.y - a.y)) * 180) / Math.PI + 360) % 360;
}

export function normDeg(n: number) {
  return ((n % 360) + 360) % 360;
}

export function signedDeg(n: number) {
  const x = normDeg(n);
  return x > 180 ? x - 360 : x;
}

export function shortestPath(
  nodes: MapNode[],
  edges: Edge[],
  startId: string,
  endId: string,
): MapNode[] {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const adj = new Map<string, { to: string; w: number }[]>();
  for (const n of nodes) adj.set(n.id, []);
  for (const [a, b] of edges) {
    const na = byId.get(a);
    const nb = byId.get(b);
    if (!na || !nb) continue;
    const w = dist(na, nb);
    adj.get(a)!.push({ to: b, w });
    adj.get(b)!.push({ to: a, w });
  }

  const distMap = new Map<string, number>();
  const prev = new Map<string, string>();
  const visited = new Set<string>();
  for (const n of nodes) distMap.set(n.id, Infinity);
  if (!distMap.has(startId)) return [];
  distMap.set(startId, 0);

  while (visited.size < nodes.length) {
    let u: string | null = null;
    let best = Infinity;
    for (const n of nodes) {
      if (visited.has(n.id)) continue;
      const d = distMap.get(n.id) ?? Infinity;
      if (d < best) {
        best = d;
        u = n.id;
      }
    }
    if (u === null || best === Infinity) break;
    visited.add(u);
    if (u === endId) break;
    for (const { to, w } of adj.get(u) ?? []) {
      const alt = (distMap.get(u) ?? Infinity) + w;
      if (alt < (distMap.get(to) ?? Infinity)) {
        distMap.set(to, alt);
        prev.set(to, u);
      }
    }
  }

  const path: string[] = [];
  let cur: string | undefined = endId;
  while (cur !== undefined) {
    path.unshift(cur);
    cur = prev.get(cur);
  }
  if (path[0] !== startId) return [];
  return path.map((id) => byId.get(id)!).filter(Boolean);
}

export function pathLengthPx(path: MapNode[]) {
  let t = 0;
  for (let i = 1; i < path.length; i++) t += dist(path[i - 1]!, path[i]!);
  return t;
}

export function pointAlongPath(path: MapNode[], travelledPx: number) {
  if (path.length === 0) return null;
  if (path.length === 1) {
    return { x: path[0]!.x, y: path[0]!.y, from: path[0]!, to: path[0]!, legIndex: 0, heading: 0 };
  }
  let acc = 0;
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1]!;
    const b = path[i]!;
    const len = dist(a, b);
    if (travelledPx <= acc + len || i === path.length - 1) {
      const t = len === 0 ? 1 : Math.min(1, Math.max(0, (travelledPx - acc) / len));
      return {
        x: a.x + (b.x - a.x) * t,
        y: a.y + (b.y - a.y) * t,
        from: a,
        to: b,
        legIndex: i,
        heading: headingFor(a, b),
      };
    }
    acc += len;
  }
  const last = path[path.length - 1]!;
  const prevN = path[path.length - 2] ?? last;
  return {
    x: last.x,
    y: last.y,
    from: prevN,
    to: last,
    legIndex: path.length - 1,
    heading: headingFor(prevN, last),
  };
}
