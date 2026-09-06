import { emptyPlan, type FloorPlan } from "./types";
import { samplePlan } from "./sample";

export const STORAGE_KEY = "rahyab-floorplan-v1";

export function loadPlan(): FloorPlan {
  if (typeof window === "undefined") return samplePlan();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return samplePlan();
    const parsed = JSON.parse(raw) as Partial<FloorPlan>;
    if (!parsed || parsed.version !== 1 || !parsed.imgDims) return samplePlan();
    return {
      ...emptyPlan(),
      ...parsed,
      version: 1,
      nodes: Array.isArray(parsed.nodes) ? parsed.nodes : [],
      edges: Array.isArray(parsed.edges) ? parsed.edges : [],
    };
  } catch {
    return samplePlan();
  }
}

export function savePlan(plan: FloorPlan) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(plan));
  } catch {
    // Quota exceeded on huge uploads — keep working in-memory.
  }
}

export function clearSavedPlan() {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
