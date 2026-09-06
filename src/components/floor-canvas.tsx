import { useRef, type PointerEvent } from "react";
import { cn } from "@/lib/utils";
import type { FloorPlan, MapNode } from "@/lib/floorplan/types";
import { KIND_LABEL } from "@/lib/floorplan/types";
import { pointAlongPath } from "@/lib/floorplan/pathfinding";

type Props = {
  plan: FloorPlan;
  path?: MapNode[];
  travelledPx?: number;
  highlightId?: string | null;
  showLabels?: boolean;
  showWayNames?: boolean;
  interactive?: boolean;
  className?: string;
  onMapPointer?: (pt: { x: number; y: number }, e: PointerEvent) => void;
  onNodePointer?: (node: MapNode, e: PointerEvent) => void;
};

export function FloorCanvas({
  plan,
  path,
  travelledPx,
  highlightId,
  showLabels = true,
  interactive = true,
  className,
  onMapPointer,
  onNodePointer,
}: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const { w, h } = plan.imgDims;
  const nodeR = Math.max(9, w / 95);
  const wayR = Math.max(6, w / 140);
  const stroke = Math.max(2, w / 420);
  const pathW = Math.max(8, w / 160);
  const edgeW = Math.max(4, w / 240);
  const font = Math.max(18, w / 52);

  function clientToMap(e: PointerEvent) {
    const svg = svgRef.current;
    if (!svg) return null;
    const ctm = svg.getScreenCTM();
    if (!ctm) return null;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const loc = pt.matrixTransform(ctm.inverse());
    return { x: Math.round(loc.x), y: Math.round(loc.y) };
  }

  function handleSvgPointer(e: PointerEvent) {
    if (!interactive || !onMapPointer) return;
    if (e.button !== undefined && e.button !== 0) return;
    const pt = clientToMap(e);
    if (pt) onMapPointer(pt, e);
  }

  const traveler =
    path && path.length > 0 && travelledPx !== undefined
      ? pointAlongPath(path, travelledPx)
      : null;

  const pathD =
    path && path.length > 1
      ? path.map((n, i) => `${i === 0 ? "M" : "L"} ${n.x} ${n.y}`).join(" ")
      : null;

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${w} ${h}`}
      className={cn(
        "block h-auto w-full select-none",
        interactive && "touch-none",
        className,
      )}
      onPointerDown={handleSvgPointer}
      role="img"
      aria-label={plan.mapName}
    >
      {plan.imgSrc ? (
        <image
          href={plan.imgSrc}
          x={0}
          y={0}
          width={w}
          height={h}
          preserveAspectRatio="xMidYMid meet"
        />
      ) : (
        <rect width={w} height={h} fill="var(--color-surface)" />
      )}

      {plan.edges.map(([a, b], i) => {
        const na = plan.nodes.find((n) => n.id === a);
        const nb = plan.nodes.find((n) => n.id === b);
        if (!na || !nb) return null;
        return (
          <line
            key={`e-${i}`}
            x1={na.x}
            y1={na.y}
            x2={nb.x}
            y2={nb.y}
            stroke="var(--color-primary)"
            strokeWidth={edgeW}
            strokeLinecap="round"
            opacity={0.28}
          />
        );
      })}

      {pathD && (
        <>
          <path
            d={pathD}
            fill="none"
            stroke="var(--color-primary-fg)"
            strokeWidth={pathW + 6}
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={0.85}
          />
          <path
            d={pathD}
            fill="none"
            stroke="var(--color-path)"
            strokeWidth={pathW}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={`${pathW * 1.6} ${pathW * 1.1}`}
            className="path-flow"
          />
        </>
      )}

      {plan.nodes.map((n) => {
        const r = n.kind === "waypoint" ? wayR : n.kind === "origin" ? nodeR + 3 : nodeR;
        const fill =
          highlightId === n.id
            ? "var(--color-path)"
            : n.kind === "origin"
              ? "var(--color-origin)"
              : n.kind === "destination"
                ? "var(--color-dest)"
                : "var(--color-way)";
        const label = n.name || KIND_LABEL[n.kind];
        return (
          <g
            key={n.id}
            transform={`translate(${n.x},${n.y})`}
            onPointerDown={(e) => {
              if (!interactive) return;
              e.stopPropagation();
              onNodePointer?.(n, e);
            }}
            style={{ cursor: interactive ? "pointer" : "default" }}
          >
            {n.kind === "origin" && (
              <circle r={r + 8} fill="none" stroke={fill} strokeWidth={stroke} opacity={0.45} />
            )}
            <circle r={r} fill={fill} stroke="var(--color-surface-2)" strokeWidth={stroke} />
            {n.kind === "origin" && (
              <rect
                x={-r * 0.32}
                y={-r * 0.32}
                width={r * 0.64}
                height={r * 0.64}
                fill="var(--color-surface-2)"
                rx={r * 0.08}
              />
            )}
            {showLabels && n.kind !== "waypoint" && (
              <text
                y={-(r + Math.max(10, w / 90))}
                textAnchor="middle"
                fontSize={font}
                fill="var(--color-fg)"
                style={{
                  fontWeight: 600,
                  paintOrder: "stroke",
                  stroke: "var(--color-surface-2)",
                  strokeWidth: 6,
                  fontFamily: "Vazirmatn, Tahoma, sans-serif",
                }}
              >
                {label}
              </text>
            )}
          </g>
        );
      })}

      {traveler && (
        <g transform={`translate(${traveler.x},${traveler.y})`}>
          <circle r={nodeR + 4} fill="var(--color-fg)" opacity={0.18} />
          <circle
            r={nodeR - 1}
            fill="var(--color-fg)"
            stroke="var(--color-surface-2)"
            strokeWidth={stroke}
          />
        </g>
      )}
    </svg>
  );
}

export function mapPointFromElement(
  svg: SVGSVGElement,
  clientX: number,
  clientY: number,
) {
  const ctm = svg.getScreenCTM();
  if (!ctm) return null;
  const pt = svg.createSVGPoint();
  pt.x = clientX;
  pt.y = clientY;
  const loc = pt.matrixTransform(ctm.inverse());
  return { x: Math.round(loc.x), y: Math.round(loc.y) };
}
