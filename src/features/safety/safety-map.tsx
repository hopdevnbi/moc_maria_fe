"use client";

import { useEffect, useRef, useState } from "react";
import type { GeoJSONSource, Map as MapLibreMap } from "maplibre-gl";
import type { SafetySession } from "./types";
import type { AttendanceRecord } from "../staff-attendance/data";
import { checkInFeatures, locationFeatures, routeFeatures } from "./safety-map-data";
import "maplibre-gl/dist/maplibre-gl.css";

// OpenFreeMap provides keyless vector maps, including commercial websites.
// GPS layers remain in browser memory; only basemap tiles/style are fetched.
const BASEMAP_STYLE = "https://tiles.openfreemap.org/styles/liberty";
const ROUTE_SOURCE = "ktv-safety-route";
const POINT_SOURCE = "ktv-safety-points";
const ACCURACY_SOURCE = "ktv-safety-accuracy";
const CHECK_IN_SOURCE = "staff-checkin-points";

export function SafetyMap({
  sessions,
  focusSessionId,
  checkIns = [],
}: {
  sessions: SafetySession[];
  focusSessionId?: string;
  checkIns?: AttendanceRecord[];
}) {
  const node = useRef<HTMLDivElement>(null);
  const map = useRef<MapLibreMap | null>(null);
  const lastFocus = useRef("");
  const [ready, setReady] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let cancelled = false;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    void import("maplibre-gl")
      .then(({ Map, NavigationControl, AttributionControl, Popup, setWorkerUrl }) => {
        if (cancelled || !node.current) return;
        // Next.js/Webpack cannot always resolve MapLibre v6's module worker.
        setWorkerUrl("/vendor/maplibre/maplibre-gl-worker.mjs");
        const instance = new Map({
          container: node.current,
          style: BASEMAP_STYLE,
          center: [105.8542, 21.0285],
          zoom: 11,
          pitchWithRotate: false,
          dragRotate: false,
          scrollZoom: false,
          attributionControl: false,
        });
        map.current = instance;
        instance.addControl(new NavigationControl({ showCompass: false }), "top-left");
        instance.addControl(
          new AttributionControl({
            compact: false,
            customAttribution:
              '<a href="https://openfreemap.org/" target="_blank" rel="noopener noreferrer">OpenFreeMap</a> · <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">© OpenStreetMap contributors</a>',
          }),
          "bottom-right",
        );
        instance.on("load", () => {
          if (cancelled) return;
          instance.addSource(ROUTE_SOURCE, {
            type: "geojson",
            data: routeFeatures([]),
          });
          instance.addSource(ACCURACY_SOURCE, {
            type: "geojson",
            data: locationFeatures([]).accuracy,
          });
          instance.addSource(POINT_SOURCE, {
            type: "geojson",
            data: locationFeatures([]).points,
          });
          instance.addSource(CHECK_IN_SOURCE, {
            type: "geojson",
            data: checkInFeatures([]),
          });
          instance.addLayer({
            id: "ktv-accuracy-fill",
            type: "fill",
            source: ACCURACY_SOURCE,
            paint: { "fill-color": ["get", "color"], "fill-opacity": 0.09 },
          });
          instance.addLayer({
            id: "ktv-accuracy-outline",
            type: "line",
            source: ACCURACY_SOURCE,
            paint: { "line-color": ["get", "color"], "line-width": 1 },
          });
          instance.addLayer({
            id: "ktv-route-line",
            type: "line",
            source: ROUTE_SOURCE,
            layout: { "line-cap": "round", "line-join": "round" },
            paint: {
              "line-color": ["case", ["get", "focused"], "#176747", "#679b86"],
              "line-width": ["case", ["get", "focused"], 5, 3],
              "line-opacity": ["case", ["get", "focused"], 0.95, 0.65],
            },
          });
          instance.addLayer({
            id: "ktv-location-dot",
            type: "circle",
            source: POINT_SOURCE,
            paint: {
              "circle-radius": 9,
              "circle-color": ["get", "color"],
              "circle-stroke-color": "#ffffff",
              "circle-stroke-width": 2,
            },
          });
          instance.addLayer({
            id: "staff-checkin-dot",
            type: "circle",
            source: CHECK_IN_SOURCE,
            paint: {
              "circle-radius": 8,
              "circle-color": ["get", "color"],
              "circle-stroke-color": "#ffffff",
              "circle-stroke-width": 2,
            },
          });
          instance.on("click", "staff-checkin-dot", (event) => {
            const feature = event.features?.[0];
            if (!feature || feature.geometry?.type !== "Point") return;
            const label = document.createElement("div");
            label.textContent = String(feature.properties?.label ?? "Điểm chấm công");
            new Popup({ closeButton: true })
              .setLngLat(feature.geometry.coordinates as [number, number])
              .setDOMContent(label)
              .addTo(instance);
          });
          instance.on("mouseenter", "staff-checkin-dot", () => {
            instance.getCanvas().style.cursor = "pointer";
          });
          instance.on("mouseleave", "staff-checkin-dot", () => {
            instance.getCanvas().style.cursor = "";
          });
          instance.on("click", "ktv-location-dot", (event) => {
            const feature = event.features?.[0];
            const coordinates = feature?.geometry;
            if (!feature || coordinates?.type !== "Point") return;
            const label = document.createElement("div");
            // Use textContent: a provider name must never become popup HTML.
            label.textContent = String(feature.properties?.label ?? "Vị trí KTV");
            new Popup({ closeButton: true })
              .setLngLat(coordinates.coordinates as [number, number])
              .setDOMContent(label)
              .addTo(instance);
          });
          instance.on("mouseenter", "ktv-location-dot", () => {
            instance.getCanvas().style.cursor = "pointer";
          });
          instance.on("mouseleave", "ktv-location-dot", () => {
            instance.getCanvas().style.cursor = "";
          });
          setReady(true);
          setNotice("");
        });
        instance.on("error", () => {
          if (!instance.isStyleLoaded()) {
            setNotice(
              "Chưa tải được bản đồ nền. Bạn vẫn có thể xem tọa độ và thời điểm GPS trong danh sách.",
            );
          }
        });
        timeout = setTimeout(() => {
          if (!cancelled && !instance.isStyleLoaded()) {
            setNotice(
              "Kết nối bản đồ đang chậm hoặc bị chặn. Vui lòng kiểm tra mạng; dữ liệu GPS vẫn hiển thị trong danh sách.",
            );
          }
        }, 12_000);
      })
      .catch(() => setNotice("Thiết bị không mở được bản đồ. Hãy xem danh sách vị trí KTV."));
    return () => {
      cancelled = true;
      if (timeout) clearTimeout(timeout);
      map.current?.remove();
      map.current = null;
    };
  }, []);

  useEffect(() => {
    const instance = map.current;
    if (!ready || !instance) return;
    const locations = locationFeatures(sessions);
    void (instance.getSource(ROUTE_SOURCE) as GeoJSONSource | undefined)?.setData(
      routeFeatures(sessions, focusSessionId),
    );
    void (instance.getSource(POINT_SOURCE) as GeoJSONSource | undefined)?.setData(locations.points);
    void (instance.getSource(ACCURACY_SOURCE) as GeoJSONSource | undefined)?.setData(
      locations.accuracy,
    );
    void (instance.getSource(CHECK_IN_SOURCE) as GeoJSONSource | undefined)?.setData(
      checkInFeatures(checkIns),
    );

    if (!focusSessionId) {
      // Show recorded check-ins even when there is no live KTV session.
      if (!sessions.some((s) => s.point) && checkIns.length) {
        const points = checkInFeatures(checkIns).features.map(
          (f) => f.geometry.coordinates as [number, number],
        );
        const focusKey = points.map((p) => p.join(",")).join("|");
        if (points.length && lastFocus.current !== focusKey) {
          const lons = points.map((p) => p[0]);
          const lats = points.map((p) => p[1]);
          instance.fitBounds(
            [
              [Math.min(...lons), Math.min(...lats)],
              [Math.max(...lons), Math.max(...lats)],
            ],
            { padding: 55, maxZoom: 15, duration: 350 },
          );
          lastFocus.current = focusKey;
        }
      } else {
        lastFocus.current = "";
      }
      return;
    }
    if (lastFocus.current === focusSessionId) return;
    const selected = sessions.find((s) => s.id === focusSessionId);
    const coordinates = [
      ...(selected?.trail ?? []).map((p) => [p.longitude, p.latitude] as [number, number]),
      ...(selected?.point
        ? [[selected.point.longitude, selected.point.latitude] as [number, number]]
        : []),
    ];
    if (coordinates.length) {
      const longitudes = coordinates.map((c) => c[0]);
      const latitudes = coordinates.map((c) => c[1]);
      instance.fitBounds(
        [
          [Math.min(...longitudes), Math.min(...latitudes)],
          [Math.max(...longitudes), Math.max(...latitudes)],
        ],
        { padding: 35, maxZoom: 16, duration: 450 },
      );
      lastFocus.current = focusSessionId;
    }
  }, [sessions, focusSessionId, checkIns, ready]);

  return (
    <div>
      {notice && (
        <p role="status" className="safety-warning">
          {notice}
        </p>
      )}
      <div
        className="safety-map"
        ref={node}
        role="region"
        aria-label="Bản đồ vị trí và hành trình chia sẻ của nhân sự"
      />
      <p className="safety-fine">
        Bản đồ nền OpenFreeMap · dữ liệu OpenStreetMap. Đường xanh: hành trình KTV đã đồng ý chia
        sẻ; ngắt tại khoảng mất GPS trên 3 phút. Xanh: điểm mới · Vàng: điểm cũ · Đỏ: SOS. Vòng tròn
        là sai số GPS.
      </p>
    </div>
  );
}
