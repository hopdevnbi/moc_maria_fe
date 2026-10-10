/** No persistence, background polling or replay of offline positions. */
export function watchSafetyLocation(
  geo: Geolocation,
  doc: Document,
  send: (point: {
    latitude: number;
    longitude: number;
    accuracy: number;
    recordedAt: string;
  }) => Promise<void>,
  notice: (message: string) => void,
) {
  let watch: number | undefined,
    timer: ReturnType<typeof setInterval> | undefined,
    active = true,
    sending = false,
    lastSent = 0,
    reading = false;
  const success = (p: GeolocationPosition) => {
    if (!active || doc.visibilityState !== "visible" || sending || Date.now() - lastSent < 10000)
      return;
    if (Date.now() - p.timestamp > 30000) {
      notice("GPS đã cũ. Đang chờ vị trí mới.");
      return;
    }
    sending = true;
    lastSent = Date.now();
    void send({
      latitude: p.coords.latitude,
      longitude: p.coords.longitude,
      accuracy: p.coords.accuracy,
      recordedAt: new Date(p.timestamp).toISOString(),
    })
      .then(() => {
        if (active) notice("Đã gửi vị trí mới cho quản trị.");
      })
      .catch(() => {
        if (active) notice("Chưa gửi được vị trí. Kiểm tra mạng; quản trị chỉ thấy điểm cũ.");
      })
      .finally(() => {
        sending = false;
      });
  };
  const failure = (e: GeolocationPositionError) => {
    if (active)
      notice(
        e.code === 1
          ? "Quyền GPS bị từ chối. Bạn vẫn có thể gửi SOS; vị trí chưa được chia sẻ."
          : "Chưa lấy được GPS. Bạn vẫn có thể gửi SOS.",
      );
  };
  const options: PositionOptions = { enableHighAccuracy: true, maximumAge: 0, timeout: 12000 };
  function stopWatch() {
    if (watch !== undefined) geo.clearWatch(watch);
    watch = undefined;
    if (timer) clearInterval(timer);
    timer = undefined;
  }
  function visibility() {
    stopWatch();
    if (!active) return;
    if (doc.visibilityState !== "visible") {
      notice("Trang đang ở nền. GPS tạm ngừng; mở lại trang để tiếp tục.");
      return;
    }
    watch = geo.watchPosition(success, failure, options);
    timer = setInterval(() => {
      if (reading) return;
      reading = true;
      geo.getCurrentPosition(
        (p) => {
          reading = false;
          success(p);
        },
        (e) => {
          reading = false;
          failure(e);
        },
        options,
      );
    }, 10000);
  }
  doc.addEventListener("visibilitychange", visibility);
  visibility();
  return () => {
    active = false;
    stopWatch();
    doc.removeEventListener("visibilitychange", visibility);
  };
}
