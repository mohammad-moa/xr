import { i as __toESM } from "../_runtime.mjs";
import { n as require_react } from "../_libs/@radix-ui/react-compose-refs+[...].mjs";
import { n as require_jsx_runtime } from "../_libs/radix-ui__react-context+react.mjs";
import { _ as Compass, a as Trash2, c as Play, d as Map$1, f as MapPinned, g as Download, h as Footprints, l as Pause, m as Link2, n as Waypoints, o as RotateCcw, p as MapPin, r as Upload, s as QrCode, t as X, u as Navigation, v as ArrowRight } from "../_libs/lucide-react.mjs";
import { a as DialogOverlay$1, c as Slot, i as DialogDescription$1, n as DialogClose, o as DialogPortal$1, r as DialogContent$1, s as DialogTitle$1, t as Dialog$1 } from "../_libs/@radix-ui/react-dialog+[...].mjs";
import { n as toast, t as Toaster } from "../_libs/sonner.mjs";
import { n as clsx, t as cva } from "../_libs/class-variance-authority+clsx.mjs";
import { t as twMerge } from "../_libs/tailwind-merge.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/routes-BVNQt9rc.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function cn(...inputs) {
	return twMerge(clsx(inputs));
}
var buttonVariants = cva("inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-[opacity,transform,background-color,box-shadow,color] duration-[var(--motion-quick)] ease-[var(--ease-out)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:pointer-events-none disabled:opacity-40 active:scale-[0.98] [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0", {
	variants: {
		variant: {
			default: "bg-primary text-primary-fg shadow-sm hover:opacity-90",
			secondary: "bg-surface-2 text-fg shadow-[var(--shadow-border)] hover:shadow-[var(--shadow-border-hover)]",
			outline: "bg-transparent text-fg shadow-[var(--shadow-border)] hover:bg-surface",
			ghost: "bg-transparent text-muted hover:bg-surface hover:text-fg",
			destructive: "bg-danger text-danger-fg hover:opacity-90"
		},
		size: {
			default: "h-11 px-4",
			sm: "h-9 rounded-md px-3 text-xs",
			lg: "h-12 px-5 text-base",
			icon: "size-11",
			"icon-sm": "size-9"
		}
	},
	defaultVariants: {
		variant: "default",
		size: "default"
	}
});
var Button = import_react.forwardRef(({ className, variant, size, asChild = false, ...props }, ref) => {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(asChild ? Slot : "button", {
		className: cn(buttonVariants({
			variant,
			size,
			className
		})),
		ref,
		...props
	});
});
Button.displayName = "Button";
var badgeVariants = cva("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium", {
	variants: { variant: {
		default: "bg-primary/10 text-primary",
		muted: "bg-surface text-muted",
		origin: "bg-fg text-bg",
		dest: "bg-primary text-primary-fg",
		way: "bg-way/30 text-muted"
	} },
	defaultVariants: { variant: "default" }
});
function Badge({ className, variant, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: cn(badgeVariants({ variant }), className),
		...props
	});
}
var Dialog = Dialog$1;
var DialogPortal = DialogPortal$1;
var DialogOverlay = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogOverlay$1, {
	ref,
	className: cn("fixed inset-0 z-50 bg-fg/40 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0", className),
	...props
}));
DialogOverlay.displayName = DialogOverlay$1.displayName;
var DialogContent = import_react.forwardRef(({ className, children, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogPortal, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogOverlay, {}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogContent$1, {
	ref,
	className: cn("fixed top-1/2 left-1/2 z-50 w-[min(100%-2rem,22rem)] -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-surface-2 p-5 text-fg shadow-[var(--shadow-border)] duration-[var(--motion-fast)] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95", className),
	...props,
	children: [children, /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogClose, {
		className: "absolute top-3 left-3 flex size-9 items-center justify-center rounded-lg text-muted hover:bg-surface hover:text-fg",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { className: "size-4" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: "sr-only",
			children: "بستن"
		})]
	})]
})] }));
DialogContent.displayName = DialogContent$1.displayName;
function DialogHeader({ className, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: cn("mb-3 space-y-1 text-right", className),
		...props
	});
}
var DialogTitle = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogTitle$1, {
	ref,
	className: cn("text-base font-semibold tracking-tight", className),
	...props
}));
DialogTitle.displayName = DialogTitle$1.displayName;
var DialogDescription = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogDescription$1, {
	ref,
	className: cn("text-sm text-muted", className),
	...props
}));
DialogDescription.displayName = DialogDescription$1.displayName;
var Input = import_react.forwardRef(({ className, type, ...props }, ref) => {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
		type,
		className: cn("flex h-11 w-full rounded-lg bg-surface-2 px-3 text-sm text-fg shadow-[var(--shadow-border)] transition-[box-shadow] duration-[var(--motion-quick)] placeholder:text-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:cursor-not-allowed disabled:opacity-50", className),
		ref,
		...props
	});
});
Input.displayName = "Input";
var KIND_LABEL = {
	origin: "مبدأ",
	destination: "مقصد",
	waypoint: "مسیر"
};
function emptyPlan() {
	return {
		version: 1,
		mapName: "نقشه سفارشی",
		imgSrc: null,
		imgDims: {
			w: 1600,
			h: 900
		},
		metersPerPixel: .024,
		nodes: [],
		edges: [],
		idCounter: 1
	};
}
function dist(a, b) {
	return Math.hypot(a.x - b.x, a.y - b.y);
}
/** Compass heading in degrees: 0 = north (up on the map), clockwise. */
function headingFor(a, b) {
	return (Math.atan2(b.x - a.x, -(b.y - a.y)) * 180 / Math.PI + 360) % 360;
}
function normDeg(n) {
	return (n % 360 + 360) % 360;
}
function signedDeg(n) {
	const x = normDeg(n);
	return x > 180 ? x - 360 : x;
}
function shortestPath(nodes, edges, startId, endId) {
	const byId = new Map(nodes.map((n) => [n.id, n]));
	const adj = /* @__PURE__ */ new Map();
	for (const n of nodes) adj.set(n.id, []);
	for (const [a, b] of edges) {
		const na = byId.get(a);
		const nb = byId.get(b);
		if (!na || !nb) continue;
		const w = dist(na, nb);
		adj.get(a).push({
			to: b,
			w
		});
		adj.get(b).push({
			to: a,
			w
		});
	}
	const distMap = /* @__PURE__ */ new Map();
	const prev = /* @__PURE__ */ new Map();
	const visited = /* @__PURE__ */ new Set();
	for (const n of nodes) distMap.set(n.id, Infinity);
	if (!distMap.has(startId)) return [];
	distMap.set(startId, 0);
	while (visited.size < nodes.length) {
		let u = null;
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
	const path = [];
	let cur = endId;
	while (cur !== void 0) {
		path.unshift(cur);
		cur = prev.get(cur);
	}
	if (path[0] !== startId) return [];
	return path.map((id) => byId.get(id)).filter(Boolean);
}
function pathLengthPx(path) {
	let t = 0;
	for (let i = 1; i < path.length; i++) t += dist(path[i - 1], path[i]);
	return t;
}
function pointAlongPath(path, travelledPx) {
	if (path.length === 0) return null;
	if (path.length === 1) return {
		x: path[0].x,
		y: path[0].y,
		from: path[0],
		to: path[0],
		legIndex: 0,
		heading: 0
	};
	let acc = 0;
	for (let i = 1; i < path.length; i++) {
		const a = path[i - 1];
		const b = path[i];
		const len = dist(a, b);
		if (travelledPx <= acc + len || i === path.length - 1) {
			const t = len === 0 ? 1 : Math.min(1, Math.max(0, (travelledPx - acc) / len));
			return {
				x: a.x + (b.x - a.x) * t,
				y: a.y + (b.y - a.y) * t,
				from: a,
				to: b,
				legIndex: i,
				heading: headingFor(a, b)
			};
		}
		acc += len;
	}
	const last = path[path.length - 1];
	const prevN = path[path.length - 2] ?? last;
	return {
		x: last.x,
		y: last.y,
		from: prevN,
		to: last,
		legIndex: path.length - 1,
		heading: headingFor(prevN, last)
	};
}
function FloorCanvas({ plan, path, travelledPx, highlightId, showLabels = true, interactive = true, className, onMapPointer, onNodePointer }) {
	const svgRef = (0, import_react.useRef)(null);
	const { w, h } = plan.imgDims;
	const nodeR = Math.max(9, w / 95);
	const wayR = Math.max(6, w / 140);
	const stroke = Math.max(2, w / 420);
	const pathW = Math.max(8, w / 160);
	const edgeW = Math.max(4, w / 240);
	const font = Math.max(18, w / 52);
	function clientToMap(e) {
		const svg = svgRef.current;
		if (!svg) return null;
		const ctm = svg.getScreenCTM();
		if (!ctm) return null;
		const pt = svg.createSVGPoint();
		pt.x = e.clientX;
		pt.y = e.clientY;
		const loc = pt.matrixTransform(ctm.inverse());
		return {
			x: Math.round(loc.x),
			y: Math.round(loc.y)
		};
	}
	function handleSvgPointer(e) {
		if (!interactive || !onMapPointer) return;
		if (e.button !== void 0 && e.button !== 0) return;
		const pt = clientToMap(e);
		if (pt) onMapPointer(pt, e);
	}
	const traveler = path && path.length > 0 && travelledPx !== void 0 ? pointAlongPath(path, travelledPx) : null;
	const pathD = path && path.length > 1 ? path.map((n, i) => `${i === 0 ? "M" : "L"} ${n.x} ${n.y}`).join(" ") : null;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", {
		ref: svgRef,
		viewBox: `0 0 ${w} ${h}`,
		className: cn("block h-auto w-full select-none", interactive && "touch-none", className),
		onPointerDown: handleSvgPointer,
		role: "img",
		"aria-label": plan.mapName,
		children: [
			plan.imgSrc ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("image", {
				href: plan.imgSrc,
				x: 0,
				y: 0,
				width: w,
				height: h,
				preserveAspectRatio: "xMidYMid meet"
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("rect", {
				width: w,
				height: h,
				fill: "var(--color-surface)"
			}),
			plan.edges.map(([a, b], i) => {
				const na = plan.nodes.find((n) => n.id === a);
				const nb = plan.nodes.find((n) => n.id === b);
				if (!na || !nb) return null;
				return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("line", {
					x1: na.x,
					y1: na.y,
					x2: nb.x,
					y2: nb.y,
					stroke: "var(--color-primary)",
					strokeWidth: edgeW,
					strokeLinecap: "round",
					opacity: .28
				}, `e-${i}`);
			}),
			pathD && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
				d: pathD,
				fill: "none",
				stroke: "var(--color-primary-fg)",
				strokeWidth: pathW + 6,
				strokeLinecap: "round",
				strokeLinejoin: "round",
				opacity: .85
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
				d: pathD,
				fill: "none",
				stroke: "var(--color-path)",
				strokeWidth: pathW,
				strokeLinecap: "round",
				strokeLinejoin: "round",
				strokeDasharray: `${pathW * 1.6} ${pathW * 1.1}`,
				className: "path-flow"
			})] }),
			plan.nodes.map((n) => {
				const r = n.kind === "waypoint" ? wayR : n.kind === "origin" ? nodeR + 3 : nodeR;
				const fill = highlightId === n.id ? "var(--color-path)" : n.kind === "origin" ? "var(--color-origin)" : n.kind === "destination" ? "var(--color-dest)" : "var(--color-way)";
				const label = n.name || KIND_LABEL[n.kind];
				return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("g", {
					transform: `translate(${n.x},${n.y})`,
					onPointerDown: (e) => {
						if (!interactive) return;
						e.stopPropagation();
						onNodePointer?.(n, e);
					},
					style: { cursor: interactive ? "pointer" : "default" },
					children: [
						n.kind === "origin" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", {
							r: r + 8,
							fill: "none",
							stroke: fill,
							strokeWidth: stroke,
							opacity: .45
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", {
							r,
							fill,
							stroke: "var(--color-surface-2)",
							strokeWidth: stroke
						}),
						n.kind === "origin" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("rect", {
							x: -r * .32,
							y: -r * .32,
							width: r * .64,
							height: r * .64,
							fill: "var(--color-surface-2)",
							rx: r * .08
						}),
						showLabels && n.kind !== "waypoint" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("text", {
							y: -(r + Math.max(10, w / 90)),
							textAnchor: "middle",
							fontSize: font,
							fill: "var(--color-fg)",
							style: {
								fontWeight: 600,
								paintOrder: "stroke",
								stroke: "var(--color-surface-2)",
								strokeWidth: 6,
								fontFamily: "Vazirmatn, Tahoma, sans-serif"
							},
							children: label
						})
					]
				}, n.id);
			}),
			traveler && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("g", {
				transform: `translate(${traveler.x},${traveler.y})`,
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", {
					r: nodeR + 4,
					fill: "var(--color-fg)",
					opacity: .18
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", {
					r: nodeR - 1,
					fill: "var(--color-fg)",
					stroke: "var(--color-surface-2)",
					strokeWidth: stroke
				})]
			})
		]
	});
}
/** Sample clinic raster is 1792×1008. Coordinates are pixel positions on that sheet. */
var SAMPLE_MAP_SRC = "/maps/noor-clinic.jpg";
var SAMPLE_DIMS = {
	w: 1792,
	h: 1008
};
var SAMPLE_METERS_PER_PX = .024;
function n(id, x, y, kind, name) {
	return {
		id,
		x,
		y,
		kind,
		name
	};
}
/**
* Pre-placed graph for کلینیک نور.
* Origin at the south entrance QR; destinations sit in room centers;
* waypoints sit in corridors / door throats so Dijkstra walks hallways, not walls.
*/
var nodes = [
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
	n("wp-wc", 1288, 710, "waypoint", "")
];
var E = (a, b) => [a, b];
var edges = [
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
	E("wp-wc", "wp-lobby-e")
];
function samplePlan() {
	return {
		version: 1,
		mapName: "کلینیک تخصصی نور · طبقه همکف",
		imgSrc: SAMPLE_MAP_SRC,
		imgDims: {
			w: SAMPLE_DIMS.w,
			h: SAMPLE_DIMS.h
		},
		metersPerPixel: SAMPLE_METERS_PER_PX,
		nodes: nodes.map((node) => ({ ...node })),
		edges: edges.map(([a, b]) => [a, b]),
		idCounter: 80
	};
}
var STORAGE_KEY = "rahyab-floorplan-v1";
function loadPlan() {
	if (typeof window === "undefined") return samplePlan();
	try {
		const raw = window.localStorage.getItem(STORAGE_KEY);
		if (!raw) return samplePlan();
		const parsed = JSON.parse(raw);
		if (!parsed || parsed.version !== 1 || !parsed.imgDims) return samplePlan();
		return {
			...emptyPlan(),
			...parsed,
			version: 1,
			nodes: Array.isArray(parsed.nodes) ? parsed.nodes : [],
			edges: Array.isArray(parsed.edges) ? parsed.edges : []
		};
	} catch {
		return samplePlan();
	}
}
function savePlan(plan) {
	try {
		window.localStorage.setItem(STORAGE_KEY, JSON.stringify(plan));
	} catch {}
}
function clearSavedPlan() {
	try {
		window.localStorage.removeItem(STORAGE_KEY);
	} catch {}
}
var MODES = [
	{
		key: "addOrigin",
		label: "مبدأ QR",
		icon: QrCode
	},
	{
		key: "addDestination",
		label: "مقصد",
		icon: MapPin
	},
	{
		key: "addWaypoint",
		label: "نقطه مسیر",
		icon: Waypoints
	},
	{
		key: "connect",
		label: "اتصال",
		icon: Link2
	},
	{
		key: "delete",
		label: "حذف",
		icon: Trash2
	}
];
function EditView({ plan, setPlan }) {
	const [mode, setMode] = (0, import_react.useState)("addWaypoint");
	const [connectFrom, setConnectFrom] = (0, import_react.useState)(null);
	const [editingNode, setEditingNode] = (0, import_react.useState)(null);
	const [dragging, setDragging] = (0, import_react.useState)(null);
	const fileRef = (0, import_react.useRef)(null);
	const jsonRef = (0, import_react.useRef)(null);
	const originExists = plan.nodes.some((n) => n.kind === "origin");
	function handleUpload(file) {
		if (!file) return;
		const reader = new FileReader();
		reader.onload = (ev) => {
			const src = ev.target?.result;
			const img = new Image();
			img.onload = () => {
				setPlan({
					...emptyPlan(),
					mapName: file.name.replace(/\.[^.]+$/, "") || "نقشه سفارشی",
					imgSrc: src,
					imgDims: {
						w: img.naturalWidth,
						h: img.naturalHeight
					}
				});
				setConnectFrom(null);
				toast.success("نقشه بارگذاری شد. حالا مبدأ و مقصدها را بگذارید.");
			};
			img.src = src;
		};
		reader.readAsDataURL(file);
	}
	function addNode(x, y) {
		if (mode === "connect" || mode === "delete") return;
		const kind = mode === "addOrigin" ? "origin" : mode === "addDestination" ? "destination" : "waypoint";
		if (kind === "origin" && originExists) {
			toast.error("فقط یک مبدأ مجاز است.");
			return;
		}
		const id = "n" + plan.idCounter;
		const node = {
			id,
			x,
			y,
			kind,
			name: ""
		};
		setPlan({
			...plan,
			nodes: [...plan.nodes, node],
			idCounter: plan.idCounter + 1
		});
		if (kind !== "waypoint") setEditingNode(id);
	}
	function handleMapPointer(pt, e) {
		if (dragging) return;
		if (e.pointerType === "mouse" && e.button !== 0) return;
		addNode(pt.x, pt.y);
	}
	function handleNodePointer(node, e) {
		e.stopPropagation();
		if (mode === "delete") {
			setPlan((prev) => ({
				...prev,
				nodes: prev.nodes.filter((n) => n.id !== node.id),
				edges: prev.edges.filter(([a, b]) => a !== node.id && b !== node.id)
			}));
			return;
		}
		if (mode === "connect") {
			if (!connectFrom) setConnectFrom(node.id);
			else if (connectFrom === node.id) setConnectFrom(null);
			else {
				setPlan((prev) => {
					if (prev.edges.some(([a, b]) => a === connectFrom && b === node.id || a === node.id && b === connectFrom)) return prev;
					return {
						...prev,
						edges: [...prev.edges, [connectFrom, node.id]]
					};
				});
				setConnectFrom(null);
			}
			return;
		}
		setDragging(node.id);
		const startX = e.clientX;
		const startY = e.clientY;
		let moved = false;
		const onMove = (ev) => {
			const svg = e.currentTarget.ownerSVGElement;
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
				nodes: prev.nodes.map((n) => n.id === node.id ? {
					...n,
					x,
					y
				} : n)
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
	function updateNodeName(id, name) {
		setPlan({
			...plan,
			nodes: plan.nodes.map((n) => n.id === id ? {
				...n,
				name
			} : n)
		});
	}
	function exportJSON() {
		const origin = plan.nodes.find((n) => n.kind === "origin");
		const data = {
			mapName: plan.mapName,
			imageSize: plan.imgDims,
			metersPerPixel: plan.metersPerPixel,
			origin: origin ? {
				id: origin.id,
				name: origin.name || "مبدأ",
				x: origin.x,
				y: origin.y
			} : null,
			destinations: plan.nodes.filter((n) => n.kind === "destination").map((n) => ({
				id: n.id,
				name: n.name || n.id,
				x: n.x,
				y: n.y
			})),
			routeNodes: plan.nodes.filter((n) => n.kind === "waypoint").map((n) => ({
				id: n.id,
				x: n.x,
				y: n.y
			})),
			edges: plan.edges
		};
		const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = "map.json";
		a.click();
		URL.revokeObjectURL(url);
	}
	function importJSON(file) {
		if (!file) return;
		const reader = new FileReader();
		reader.onload = () => {
			try {
				const data = JSON.parse(String(reader.result));
				const importedNodes = data.nodes ? data.nodes : [
					...data.origin ? [{
						id: data.origin.id,
						x: data.origin.x,
						y: data.origin.y,
						kind: "origin",
						name: data.origin.name
					}] : [],
					...(data.destinations ?? []).map((d) => ({
						...d,
						kind: "destination"
					})),
					...(data.routeNodes ?? []).map((d) => ({
						...d,
						kind: "waypoint",
						name: ""
					}))
				];
				setPlan({
					...plan,
					mapName: data.mapName || plan.mapName,
					imgDims: data.imageSize || plan.imgDims,
					metersPerPixel: data.metersPerPixel ?? plan.metersPerPixel,
					nodes: importedNodes,
					edges: data.edges ?? plan.edges,
					idCounter: importedNodes.length + 10
				});
				toast.success("مختصات از JSON بارگذاری شد.");
			} catch {
				toast.error("فایل JSON نامعتبر است.");
			}
		};
		reader.readAsText(file);
	}
	const hint = mode === "connect" ? connectFrom ? "حالا نقطه‌ی دوم را بزنید" : "روی اولین نقطه بزنید تا وصل شود" : mode === "delete" ? "روی نقطه‌ای بزنید که حذف شود" : "روی نقشه بزنید تا نقطه اضافه شود · بکشید تا جابه‌جا شود";
	const labeled = plan.nodes.filter((n) => n.kind !== "waypoint");
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "mx-auto flex w-full max-w-3xl flex-col gap-3 px-3 pb-10 pt-3 sm:px-4",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "rounded-2xl bg-surface-2 p-4 shadow-[var(--shadow-border)]",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex flex-wrap items-start justify-between gap-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-xs font-medium tracking-wide text-muted",
								children: "نقشه فعال"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
								className: "text-base font-semibold",
								children: plan.mapName
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "mt-1 text-xs text-subtle",
								children: [
									plan.imgDims.w,
									" × ",
									plan.imgDims.h,
									"px · مقیاس ",
									plan.metersPerPixel,
									" m/px"
								]
							})
						] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex flex-wrap gap-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
								variant: "secondary",
								size: "sm",
								onClick: () => fileRef.current?.click(),
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Upload, {}), "آپلود نقشه"]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
								variant: "ghost",
								size: "sm",
								onClick: () => {
									clearSavedPlan();
									setPlan(samplePlan());
									setConnectFrom(null);
									toast.success("نقشه نمونه کلینیک نور بارگذاری شد.");
								},
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(RotateCcw, {}), "نمونه پیش‌فرض"]
							})]
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						ref: fileRef,
						type: "file",
						accept: "image/*",
						className: "hidden",
						onChange: (e) => {
							handleUpload(e.target.files?.[0]);
							e.target.value = "";
						}
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						ref: jsonRef,
						type: "file",
						accept: "application/json,.json",
						className: "hidden",
						onChange: (e) => {
							importJSON(e.target.files?.[0]);
							e.target.value = "";
						}
					})
				]
			}),
			!plan.imgSrc ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
				type: "button",
				onClick: () => fileRef.current?.click(),
				className: "rounded-2xl border border-dashed border-border bg-surface-2 px-4 py-12 text-center shadow-[var(--shadow-border)]",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Upload, { className: "mx-auto size-6 text-primary" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-3 text-sm font-medium",
						children: "برای آپلود نقشه (PNG / JPG) اینجا بزنید"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-1 text-xs text-muted",
						children: "یا از دکمه «نمونه پیش‌فرض» استفاده کنید"
					})
				]
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex flex-wrap gap-1.5",
					children: [MODES.map(({ key, label, icon: Icon }) => {
						const disabled = key === "addOrigin" && originExists;
						const active = mode === key;
						return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
							type: "button",
							size: "sm",
							disabled,
							variant: active ? "default" : "secondary",
							onClick: () => {
								setMode(key);
								setConnectFrom(null);
							},
							className: cn(key === "delete" && active && "bg-danger text-danger-fg"),
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, {}), label]
						}, key);
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: "ms-auto flex gap-1.5",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							variant: "secondary",
							size: "sm",
							onClick: () => jsonRef.current?.click(),
							children: "JSON ورودی"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
							variant: "outline",
							size: "sm",
							onClick: exportJSON,
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Download, {}), "دانلود JSON"]
						})]
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-xs text-muted",
					children: hint
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "overflow-hidden rounded-2xl bg-surface-2 p-2 shadow-[var(--shadow-border)]",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "overflow-hidden rounded-xl outline outline-1 -outline-offset-1 outline-fg/10",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FloorCanvas, {
							plan,
							highlightId: connectFrom,
							onMapPointer: handleMapPointer,
							onNodePointer: handleNodePointer,
							className: mode === "connect" || mode === "delete" ? "cursor-pointer" : "cursor-crosshair"
						})
					})
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center justify-between text-xs text-muted",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
						plan.nodes.length,
						" نقطه · ",
						plan.edges.length,
						" اتصال"
					] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: "flex gap-1.5",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
								variant: "origin",
								children: "مبدأ"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
								variant: "dest",
								children: "مقصد"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
								variant: "way",
								children: "مسیر"
							})
						]
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
					className: "rounded-2xl bg-surface-2 p-4 shadow-[var(--shadow-border)]",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
							className: "mb-3 text-sm font-semibold",
							children: "مختصات نقاط"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "overflow-x-auto",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", {
								className: "w-full min-w-[22rem] text-right text-sm",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", {
									className: "text-xs text-muted",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
										className: "border-b border-border",
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
												className: "py-2 font-medium",
												children: "نام"
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
												className: "py-2 font-medium",
												children: "نوع"
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
												className: "py-2 font-medium tabular-nums",
												children: "X"
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
												className: "py-2 font-medium tabular-nums",
												children: "Y"
											})
										]
									})
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", { children: labeled.map((n) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
									className: "border-b border-border/70 last:border-0",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
											className: "py-2 font-medium",
											children: n.name || "—"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
											className: "py-2 text-muted",
											children: KIND_LABEL[n.kind]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
											className: "py-2 tabular-nums text-muted",
											children: n.x
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
											className: "py-2 tabular-nums text-muted",
											children: n.y
										})
									]
								}, n.id)) })]
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-3 text-xs text-subtle",
							children: "مختصات نسبت به گوشه بالا-چپ نقشه است (پیکسل). مبدأ را جایی بگذارید که QR نصب می‌شود."
						})
					]
				})
			] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Dialog, {
				open: !!editingNode,
				onOpenChange: (o) => !o && setEditingNode(null),
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogContent, { children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogHeader, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogTitle, { children: "نام‌گذاری نقطه" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogDescription, { children: "مثلاً رادیولوژی یا ورودی اصلی" })] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
						autoFocus: true,
						placeholder: "نام نقطه",
						defaultValue: plan.nodes.find((n) => n.id === editingNode)?.name || "",
						onChange: (e) => editingNode && updateNodeName(editingNode, e.target.value)
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						className: "mt-3 w-full",
						onClick: () => setEditingNode(null),
						children: "تأیید"
					})
				] })
			})
		]
	});
}
function NavigateView({ plan }) {
	const [destination, setDestination] = (0, import_react.useState)(null);
	const [phase, setPhase] = (0, import_react.useState)("pick");
	const [travelled, setTravelled] = (0, import_react.useState)(0);
	const [heading, setHeading] = (0, import_react.useState)(null);
	const [simHeading, setSimHeading] = (0, import_react.useState)(0);
	const [walking, setWalking] = (0, import_react.useState)(false);
	const [camReady, setCamReady] = (0, import_react.useState)(false);
	const videoRef = (0, import_react.useRef)(null);
	const streamRef = (0, import_react.useRef)(null);
	const walkRef = (0, import_react.useRef)(null);
	const lastTs = (0, import_react.useRef)(null);
	const originNode = plan.nodes.find((n) => n.kind === "origin");
	const destinationNodes = plan.nodes.filter((n) => n.kind === "destination");
	const pathNodes = (0, import_react.useMemo)(() => originNode && destination ? shortestPath(plan.nodes, plan.edges, originNode.id, destination.id) : [], [
		originNode,
		destination,
		plan.nodes,
		plan.edges
	]);
	const totalPx = (0, import_react.useMemo)(() => pathLengthPx(pathNodes), [pathNodes]);
	const totalM = totalPx * plan.metersPerPixel;
	const remainingM = Math.max(0, (totalPx - travelled) * plan.metersPerPixel);
	const traveler = pathNodes.length ? pointAlongPath(pathNodes, travelled) : null;
	const arrived = remainingM < .4 && pathNodes.length > 0;
	const arrowAngle = signedDeg((traveler ? headingFor(traveler.from, traveler.to) : 0) - (heading ?? simHeading));
	(0, import_react.useEffect)(() => {
		function onOrient(e) {
			const x = e;
			if (typeof x.webkitCompassHeading === "number") setHeading(normDeg(x.webkitCompassHeading));
			else if (typeof e.alpha === "number") setHeading(normDeg(360 - e.alpha));
		}
		window.addEventListener("deviceorientation", onOrient, true);
		return () => window.removeEventListener("deviceorientation", onOrient, true);
	}, []);
	(0, import_react.useEffect)(() => {
		if (!walking || arrived) {
			if (walkRef.current) cancelAnimationFrame(walkRef.current);
			walkRef.current = null;
			lastTs.current = null;
			if (arrived) setWalking(false);
			return;
		}
		const speedMps = 1.15;
		const tick = (ts) => {
			if (lastTs.current == null) lastTs.current = ts;
			const dt = Math.min(.1, (ts - lastTs.current) / 1e3);
			lastTs.current = ts;
			const stepPx = speedMps * dt / plan.metersPerPixel;
			setTravelled((t) => Math.min(totalPx, t + stepPx));
			walkRef.current = requestAnimationFrame(tick);
		};
		walkRef.current = requestAnimationFrame(tick);
		return () => {
			if (walkRef.current) cancelAnimationFrame(walkRef.current);
		};
	}, [
		walking,
		arrived,
		totalPx,
		plan.metersPerPixel
	]);
	(0, import_react.useEffect)(() => {
		if (traveler && heading === null) setSimHeading(traveler.heading);
	}, [
		traveler?.heading,
		heading,
		traveler
	]);
	(0, import_react.useEffect)(() => {
		return () => {
			streamRef.current?.getTracks().forEach((t) => t.stop());
		};
	}, []);
	async function requestCompass() {
		const DOE = DeviceOrientationEvent;
		try {
			if (typeof DOE.requestPermission === "function") await DOE.requestPermission();
		} catch {}
	}
	async function startGuide() {
		setPhase("guide");
		setTravelled(0);
		setWalking(false);
		await requestCompass();
		try {
			const s = await navigator.mediaDevices.getUserMedia({
				video: { facingMode: { ideal: "environment" } },
				audio: false
			});
			streamRef.current = s;
			if (videoRef.current) {
				videoRef.current.srcObject = s;
				await videoRef.current.play();
			}
			setCamReady(true);
		} catch {
			setCamReady(false);
		}
	}
	function exitGuide() {
		streamRef.current?.getTracks().forEach((t) => t.stop());
		streamRef.current = null;
		setCamReady(false);
		setWalking(false);
		setPhase(destination ? "preview" : "pick");
	}
	function pick(d) {
		setDestination(d);
		setTravelled(0);
		setWalking(false);
		setPhase("preview");
	}
	if (!originNode || destinationNodes.length === 0) return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "mx-auto max-w-md px-5 py-16 text-center",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(MapPinned, { className: "mx-auto size-8 text-primary" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "mt-3 text-sm text-muted",
			children: "هنوز نقشه‌ای آماده نیست. در تب «ویرایش نقشه» یک مبدأ (QR) و حداقل یک مقصد بگذارید."
		})]
	});
	if (phase === "pick") return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "mx-auto w-full max-w-lg px-3 pb-10 pt-4 sm:px-4",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
				className: "text-lg font-semibold tracking-tight",
				children: "کجا می‌روید؟"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-1 mb-4 text-sm text-muted",
				children: "مقصد را انتخاب کنید تا کوتاه‌ترین مسیر روی نقشه نمونه دیده شود."
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
				className: "flex flex-col gap-2",
				children: destinationNodes.map((d) => {
					const p = shortestPath(plan.nodes, plan.edges, originNode.id, d.id);
					const meters = pathLengthPx(p) * plan.metersPerPixel;
					const reachable = p.length > 0;
					return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						type: "button",
						onClick: () => reachable && pick(d),
						disabled: !reachable,
						className: "flex w-full items-center gap-3 rounded-2xl bg-surface-2 px-4 py-3 text-right shadow-[var(--shadow-border)] transition-[box-shadow] duration-[var(--motion-quick)] hover:shadow-[var(--shadow-border-hover)] disabled:opacity-40",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(MapPinned, { className: "size-4" })
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "min-w-0 flex-1",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "block truncate font-medium",
									children: d.name || d.id
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "block text-xs text-muted tabular-nums",
									children: reachable ? `${meters.toFixed(0)} متر از ورودی` : "مسیر وصل نیست"
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArrowRight, { className: "size-4 rotate-180 text-subtle" })
						]
					}) }, d.id);
				})
			})
		]
	});
	if (phase === "preview" && destination) return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "mx-auto flex w-full max-w-3xl flex-col gap-3 px-3 pb-10 pt-3 sm:px-4",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-start justify-between gap-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-xs font-medium text-muted",
						children: "مسیر تا"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
						className: "text-lg font-semibold",
						children: destination.name
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-1 text-sm text-muted tabular-nums",
						children: pathNodes.length ? `${totalM.toFixed(0)} متر · ${Math.max(1, pathNodes.length - 1)} بخش` : "مسیری پیدا نشد — اتصال‌ها را در ویرایشگر چک کنید"
					})
				] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					variant: "ghost",
					size: "sm",
					onClick: () => setPhase("pick"),
					children: "عوض کردن"
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "overflow-hidden rounded-2xl bg-surface-2 p-2 shadow-[var(--shadow-border)]",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "overflow-hidden rounded-xl outline outline-1 -outline-offset-1 outline-fg/10",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FloorCanvas, {
						plan,
						path: pathNodes,
						travelledPx: 0,
						interactive: false
					})
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
				className: "h-12 w-full",
				onClick: startGuide,
				disabled: !pathNodes.length,
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Navigation, {}), "شروع ناوبری"]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-center text-xs text-subtle",
				children: "روی گوشی، دوربین و قطب‌نما فعال می‌شوند. در پیش‌نمایش می‌توانید مسیر را شبیه‌سازی کنید."
			})
		]
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "relative isolate min-h-[calc(100dvh-3.5rem)] overflow-hidden bg-nav text-nav-fg",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("video", {
				ref: videoRef,
				muted: true,
				playsInline: true,
				className: "absolute inset-0 size-full object-cover",
				style: { opacity: camReady ? 1 : 0 }
			}),
			!camReady && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "absolute inset-0",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "h-full w-full origin-center scale-[1.04] opacity-90",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FloorCanvas, {
						plan,
						path: pathNodes,
						travelledPx: travelled,
						interactive: false,
						showLabels: true
					})
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "pointer-events-none absolute inset-0 bg-gradient-to-b from-nav/55 via-transparent to-nav/80" })]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "relative z-10 flex min-h-[calc(100dvh-3.5rem)] flex-col justify-between gap-3 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center justify-between gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
							variant: "secondary",
							size: "sm",
							className: "bg-nav/55 text-nav-fg shadow-none backdrop-blur-sm hover:bg-nav/70",
							onClick: exitGuide,
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArrowRight, { className: "rotate-180" }), "خروج"]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
							variant: "muted",
							className: "bg-nav/55 text-nav-fg",
							children: camReady ? "دوربین فعال" : "پیش‌نمایش مسیر"
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex flex-col items-center text-center",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-4xl font-semibold tabular-nums tracking-tight",
								children: arrived ? "رسیدید" : `${remainingM.toFixed(0)} m`
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "mt-2 text-nav-fg transition-transform duration-[var(--motion-fast)] ease-[var(--ease-out)]",
								style: { transform: `rotate(${arrived ? 0 : arrowAngle}deg)` },
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Navigation, {
									className: "size-16 fill-current",
									strokeWidth: 1.5
								})
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "mt-2 rounded-full bg-nav/50 px-3 py-1 text-xs tabular-nums",
								children: arrived ? `به ${destination?.name ?? ""} رسیدید` : heading === null ? `شبیه‌ساز قطب‌نما · waypoint ${traveler?.legIndex ?? 0}/${Math.max(1, pathNodes.length - 1)}` : `waypoint ${traveler?.legIndex ?? 0}/${Math.max(1, pathNodes.length - 1)}`
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "space-y-2",
						children: [
							camReady && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "overflow-hidden rounded-xl bg-nav/40 p-1.5 backdrop-blur-sm",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FloorCanvas, {
									plan,
									path: pathNodes,
									travelledPx: travelled,
									interactive: false,
									showLabels: false,
									className: "max-h-36"
								})
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "grid grid-cols-2 gap-2",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
									variant: "secondary",
									className: "bg-nav/55 text-nav-fg shadow-none hover:bg-nav/70",
									onClick: () => setWalking((w) => !w),
									disabled: arrived,
									children: [walking ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Pause, {}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Play, {}), walking ? "توقف" : "حرکت خودکار"]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
									variant: "secondary",
									className: "bg-nav/55 text-nav-fg shadow-none hover:bg-nav/70",
									onClick: () => setTravelled((t) => Math.min(totalPx, t + 2 / plan.metersPerPixel)),
									disabled: arrived,
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Footprints, {}), "یک قدم"]
								})]
							}),
							heading === null && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
								className: "flex items-center gap-3 rounded-xl bg-nav/45 px-3 py-2 text-xs",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Compass, { className: "size-4 shrink-0" }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
										className: "w-16 tabular-nums",
										children: [Math.round(simHeading), "°"]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
										type: "range",
										min: 0,
										max: 359,
										value: Math.round(simHeading),
										onChange: (e) => setSimHeading(Number(e.target.value)),
										className: "h-11 w-full accent-primary"
									})
								]
							})
						]
					})
				]
			})
		]
	});
}
function AppHome() {
	const [tab, setTab] = (0, import_react.useState)("edit");
	const [plan, setPlan] = (0, import_react.useState)(() => samplePlan());
	const [ready, setReady] = (0, import_react.useState)(false);
	(0, import_react.useEffect)(() => {
		setPlan(loadPlan());
		setReady(true);
	}, []);
	(0, import_react.useEffect)(() => {
		if (!ready) return;
		savePlan(plan);
	}, [plan, ready]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "min-h-dvh bg-bg text-fg",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
				className: "sticky top-0 z-20 border-b border-border/80 bg-surface-2/90 backdrop-blur-md",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "mx-auto flex max-w-3xl items-center justify-between gap-3 px-3 pt-[max(0.5rem,env(safe-area-inset-top))] pb-0 sm:px-4",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center gap-2.5 py-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "flex size-9 items-center justify-center rounded-lg bg-primary text-primary-fg",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Compass, { className: "size-4" })
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-sm font-semibold leading-tight",
							children: "راهیاب"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-[11px] text-muted",
							children: "ناوبری داخل ساختمان"
						})] })]
					})
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("nav", {
					className: "mx-auto grid max-w-3xl grid-cols-2 px-3 sm:px-4",
					"aria-label": "بخش‌ها",
					children: [{
						key: "edit",
						label: "ویرایش نقشه",
						icon: Map$1
					}, {
						key: "navigate",
						label: "ناوبری",
						icon: Compass
					}].map(({ key, label, icon: Icon }) => {
						const active = tab === key;
						return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							type: "button",
							onClick: () => setTab(key),
							className: cn("relative flex h-12 items-center justify-center gap-2 text-sm transition-colors duration-[var(--motion-quick)]", active ? "font-semibold text-primary" : "font-medium text-muted"),
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, { className: "size-4" }),
								label,
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: cn("absolute inset-x-6 bottom-0 h-0.5 rounded-full bg-primary transition-opacity duration-[var(--motion-quick)]", active ? "opacity-100" : "opacity-0") })
							]
						}, key);
					})
				})]
			}),
			tab === "edit" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(EditView, {
				plan,
				setPlan
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(NavigateView, { plan }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Toaster, {
				position: "bottom-center",
				dir: "rtl",
				toastOptions: { className: "font-sans" }
			})
		]
	});
}
function Home() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AppHome, {});
}
//#endregion
export { Home as component };
