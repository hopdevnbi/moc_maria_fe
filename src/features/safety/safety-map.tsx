"use client";
import { useEffect, useRef, useState } from "react";
import type { Map as LeafletMap, LayerGroup } from "leaflet";
import type { SafetySession } from "./types";
import { ongoing, time } from "./types";
import "leaflet/dist/leaflet.css";
export function SafetyMap({ sessions }: { sessions: SafetySession[] }) {
  const node = useRef<HTMLDivElement>(null),
    map = useRef<LeafletMap | null>(null),
    layer = useRef<LayerGroup | null>(null),
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
    });
    return () => {
      cancelled = true;
    };
  }, [sessions, ready]);
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
        aria-label="Bản đồ vị trí KTV tại Hà Nội"
      />
      <p className="safety-fine">
        Xanh: điểm mới · Vàng: điểm cũ · Đỏ: SOS. Vòng tròn biểu thị sai số GPS. Bản đồ không xác
        nhận KTV đang ở chính xác địa chỉ khách.
      </p>
    </div>
  );
}
