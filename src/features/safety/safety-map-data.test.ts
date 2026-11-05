import { describe, expect, it } from "vitest";
import { locationFeatures, routeFeatures, routeSegments } from "./safety-map-data";
import type { SafetySession, SafetyTrailPoint } from "./types";

const iso = (seconds: number) => new Date(Date.UTC(2026, 10, 5, 12, 0, seconds)).toISOString();
const point = (seconds: number): SafetyTrailPoint => ({
  latitude: 21.0285,
  longitude: 105.8542,
  accuracy: 15,
  recordedAt: iso(seconds),
});
const session = (): SafetySession => ({
  id: "route-123",
  providerName: "Test KTV",
  inquiryId: "inquiry",
  status: "TRAVELLING",
  sharing: true,
  startedAt: iso(0),
  expiresAt: new Date(Date.UTC(2026, 10, 5, 14)).toISOString(),
  expectedCheckAt: new Date(Date.UTC(2026, 10, 5, 13)).toISOString(),
  locationState: "WAITING",
  overdue: false,
  visit: null,
  routeConsent: true,
  trail: [point(0), point(25), point(60 * 7), point(60 * 7 + 25)],
  point: null,
  sos: null,
});

describe("KTV route map data", () => {
  it("breaks routes across GPS outages longer than three minutes", () => {
    const segments = routeSegments(session().trail!);
    expect(segments.map((segment) => segment.length)).toEqual([2, 2]);
  });
  it("keeps GPS coordinate overlays local and correctly orders longitude/latitude", () => {
    const features = routeFeatures([session()], "route-123");
    expect(features.features).toHaveLength(2);
    expect(features.features[0].geometry.coordinates[0]).toEqual([105.8542, 21.0285]);
    expect(features.features[0].properties?.focused).toBe(true);
  });
  it("shows the last point and accuracy ring with a recent GPS status", () => {
    const s = session();
    s.point = { ...point(0), receivedAt: iso(0) };
    const features = locationFeatures([s], Date.parse(iso(10)));
    expect(features.points.features).toHaveLength(1);
    expect(features.points.features[0].properties?.color).toBe("#21674a");
    expect(features.accuracy.features[0].geometry.coordinates[0]).toHaveLength(37);
  });
  it("does not display any location when a session has no GPS", () => {
    expect(locationFeatures([session()]).points.features).toHaveLength(0);
  });
});
