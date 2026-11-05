"use client";
import { useEffect, useRef, useState } from "react";
import type { Map as LeafletMap, LayerGroup } from "leaflet";
import type { SafetySession } from "./types";
import { ongoing, time } from "./types";
import "leaflet/dist/leaflet.css";
export function SafetyMap({
  sessions,
  focusSessionId,
}: {
  sessions: SafetySession[];
  focusSessionId?: string;
}) {
  const node = useRef<HTMLDivElement>(null),
    map = useRef<LeafletMap | null>(null),
    layer = useRef<LayerGroup | null>(null),
    lastFocus = useRef(""),
    [ready, setReady] = useState(false),
    [notice, setNotice] = useState("");
  useEffect(() => {
    let cancelled = false;
    void import("leaflet")
      .then((L) => {
        if (cancelled || !node.current) return;
        map.current = L.map(node.current, { scrollWheelZoom: false }).setView(
          [21.0285, 105.8542],
          11,
        );
        layer.current = L.layerGroup().addTo(map.current);
        L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
          maxZoom: 19,
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        })
          .on("tileerror", () =>
            setNotice(
              "Chưa tải được bản đồ nền. Vẫn có thể xem tọa độ và thời điểm cập nhật trong danh sách.",
            ),
          )
          .addTo(map.current);
        setReady(true);
      })
      .catch(() => setNotice("Chưa tải được bản đồ. Vui lòng xem danh sách vị trí."));
    return () => {
      cancelled = true;
      map.current?.remove();
      map.current = null;
      layer.current = null;
    };
  }, []);
  useEffect(() => {
    if (!ready || !layer.current) return;
    let cancelled = false;
    void import("leaflet").then((L) => {
      if (cancelled || !layer.current) return;
      layer.current.clearLayers();
      for (const s of sessions) {
        const route = s.trail ?? [];
        // Do not draw a misleading straight line across a long GPS outage.
        if (route.length > 1) {
          let segment = [route[0]];
          const draw = () => {
            if (segment.length < 2) return;
            L.polyline(
              segment.map((p) => [p.latitude, p.longitude] as [number, number]),
              {
                color: focusSessionId === s.id ? "#176747" : "#679b86",
                weight: focusSessionId === s.id ? 5 : 3,
                opacity: focusSessionId === s.id ? 0.9 : 0.55,
              },
            ).addTo(layer.current!);
          };
          for (const point of route.slice(1)) {
            if (
              Date.parse(point.recordedAt) - Date.parse(segment[segment.length - 1].recordedAt) >
              180000
            ) {
              draw();
              segment = [point];
            } else {
              segment.push(point);
            }
          }
          draw();
        }
        const p = s.point || s.sos?.point;
        if (!p) continue;
        const recent = ongoing(s) && s.sharing && Date.now() - Date.parse(p.recordedAt) <= 60000;
        const color =
          s.sos && s.sos.status !== "RESOLVED" ? "#b63732" : recent ? "#21674a" : "#9b762e";
        L.circle([p.latitude, p.longitude], {
          radius: p.accuracy,
          color,
          weight: 1,
          fillOpacity: 0.07,
        }).addTo(layer.current);
        const label = document.createElement("div");
        label.textContent =
          s.providerName + " · " + time(p.recordedAt) + (recent ? " · Điểm mới" : " · Điểm cũ");
        L.circleMarker([p.latitude, p.longitude], {
          radius: 9,
          color,
          fillColor: color,
          fillOpacity: 0.85,
        })
          .bindTooltip(label)
          .addTo(layer.current);
      }
      if (focusSessionId && map.current && focusSessionId !== lastFocus.current) {
        const chosen = sessions.find((session) => session.id === focusSessionId);
        const coordinates = [
          ...(chosen?.trail ?? []).map(
            (point) => [point.latitude, point.longitude] as [number, number],
          ),
          ...(chosen?.point
            ? [[chosen.point.latitude, chosen.point.longitude] as [number, number]]
            : []),
        ];
        if (coordinates.length) {
          map.current.fitBounds(L.latLngBounds(coordinates).pad(0.25), { maxZoom: 16 });
          lastFocus.current = focusSessionId;
        }
      }
    });
    return () => {
      cancelled = true;
    };
  }, [sessions, ready, focusSessionId]);
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
        aria-label="Bản đồ vị trí và hành trình chia sẻ của KTV"
      />
      <p className="safety-fine">
        Đường xanh: hành trình GPS được KTV đồng ý chia sẻ. Đường bị ngắt tại khoảng mất GPS trên 3
        phút. Xanh: điểm mới · Vàng: điểm cũ · Đỏ: SOS. Vòng tròn biểu thị sai số GPS.
      </p>
    </div>
  );
}
