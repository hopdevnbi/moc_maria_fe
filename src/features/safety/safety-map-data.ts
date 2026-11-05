import type { Feature, FeatureCollection, LineString, Point, Polygon } from "geojson";
import type { SafetySession, SafetyTrailPoint } from "./types";
import { ongoing, time } from "./types";

const MAX_GAP_MS = 180_000;

export type RouteProperties = { sessionId: string; focused: boolean };
export type LocationProperties = { color: string; label: string };
export type AccuracyProperties = { color: string };

/** Keep GPS outages as gaps rather than drawing misleading straight lines. */
export function routeSegments(points: SafetyTrailPoint[]): SafetyTrailPoint[][] {
  const result: SafetyTrailPoint[][] = [];
  let segment: SafetyTrailPoint[] = [];
  for (const point of points) {
    if (
      segment.length &&
      Date.parse(point.recordedAt) - Date.parse(segment[segment.length - 1].recordedAt) > MAX_GAP_MS
    ) {
      if (segment.length > 1) result.push(segment);
      segment = [];
    }
    segment.push(point);
  }
  if (segment.length > 1) result.push(segment);
  return result;
}

export function routeFeatures(
  sessions: SafetySession[],
  focusSessionId?: string,
): FeatureCollection<LineString, RouteProperties> {
  const features: Feature<LineString, RouteProperties>[] = [];
  for (const session of sessions) {
    for (const segment of routeSegments(session.trail ?? [])) {
      features.push({
        type: "Feature",
        geometry: {
          type: "LineString",
          coordinates: segment.map((p) => [p.longitude, p.latitude]),
        },
        properties: { sessionId: session.id, focused: session.id === focusSessionId },
      });
    }
  }
  return { type: "FeatureCollection", features };
}

function accuracyCircle(lat: number, lon: number, radius: number): [number, number][] {
  const distance = Math.min(Math.max(radius, 1), 1_000);
  const x = distance / (111_320 * Math.max(Math.cos((lat * Math.PI) / 180), 0.1));
  const y = distance / 111_320;
  const ring: [number, number][] = [];
  for (let i = 0; i <= 36; i++) {
    const angle = (i * 2 * Math.PI) / 36;
    ring.push([lon + x * Math.cos(angle), lat + y * Math.sin(angle)]);
  }
  return ring;
}

export function locationFeatures(
  sessions: SafetySession[],
  now = Date.now(),
): {
  points: FeatureCollection<Point, LocationProperties>;
  accuracy: FeatureCollection<Polygon, AccuracyProperties>;
} {
  const points: Feature<Point, LocationProperties>[] = [];
  const accuracy: Feature<Polygon, AccuracyProperties>[] = [];
  for (const session of sessions) {
    const p = session.point || session.sos?.point;
    if (!p) continue;
    const fresh = ongoing(session) && session.sharing && now - Date.parse(p.recordedAt) <= 60_000;
    const color =
      session.sos && session.sos.status !== "RESOLVED" ? "#b63732" : fresh ? "#21674a" : "#9b762e";
    points.push({
      type: "Feature",
      geometry: { type: "Point", coordinates: [p.longitude, p.latitude] },
      properties: {
        color,
        label: `${session.providerName} · ${time(p.recordedAt)} · ${fresh ? "Điểm mới" : "Điểm cũ"}`,
      },
    });
    if (Number.isFinite(p.accuracy) && p.accuracy > 0) {
      accuracy.push({
        type: "Feature",
        geometry: {
          type: "Polygon",
          coordinates: [accuracyCircle(p.latitude, p.longitude, p.accuracy)],
        },
        properties: { color },
      });
    }
  }
  return {
    points: { type: "FeatureCollection", features: points },
    accuracy: { type: "FeatureCollection", features: accuracy },
  };
}
