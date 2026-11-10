/* Keep this standalone script ES5-compatible. It must not depend on Next/React,
   browser storage access, authentication, or a working API connection. */
(function () {
  "use strict";
  var reopen = document.getElementById("reopen");
  var button = document.getElementById("refresh-app");
  var result = document.getElementById("result");
  var destination = "/tai-khoan";
  var allowed = ["/", "/tai-khoan", "/dang-nhap", "/check-in", "/tin-nhan", "/lich-hen"];
  var match = /(?:^|[?&])returnTo=([^&]*)/.exec(window.location.search);
  try {
    var requested = match ? decodeURIComponent(match[1]) : "";
    if (allowed.indexOf(requested) !== -1) destination = requested;
  } catch (error) {
    void error;
    // Malformed URLs must still leave a working account link.
  }
  function freshUrl() {
    return destination + "?moc_reload=" + new Date().getTime();
  }
  reopen.href = freshUrl();

  var ios = /(?:CPU (?:iPhone )?OS|iPhone OS) (\d+)[_.](\d+)(?:[_.](\d+))?/.exec(
    navigator.userAgent
  );
  var standalone = navigator.standalone === true;
  if (!standalone && window.matchMedia) {
    standalone = window.matchMedia("(display-mode: standalone)").matches;
  }
  var device = ios
    ? "iOS " + ios[1] + "." + ios[2] + (ios[3] ? "." + ios[3] : "")
    : "Trình duyệt web";
  document.getElementById("device-info").textContent =
    device +
    " · " +
    (standalone ? "Ứng dụng màn hình chính" : "Trong trình duyệt") +
    " · " +
    (navigator.onLine === false
      ? "Thiết bị đang báo ngoại tuyến"
      : "Thiết bị đang có kết nối mạng");
  if (ios && (Number(ios[1]) < 16 || (Number(ios[1]) === 16 && Number(ios[2]) < 4))) {
    document.getElementById("intro").textContent =
      "Phiên bản iOS trên máy này cần được cập nhật để Mộc hoạt động đầy đủ.";
    document.getElementById("ios-help").textContent =
      "Phiên bản iOS này cũ hơn mức Mộc hỗ trợ (Safari 16.4). Hãy cập nhật iOS trong Cài đặt → Cài đặt chung → Cập nhật phần mềm, rồi mở lại Mộc.";
    var check = document.getElementById("browser-check");
    check.parentNode.insertBefore(check, document.getElementById("restore-controls"));
  }

  if (typeof Promise === "undefined") return;
  button.hidden = false;
  button.addEventListener("click", function () {
    button.disabled = true;
    result.textContent = "Đang làm mới ứng dụng…";
    // Safari storage/service-worker calls can stall too. Always leave a way
    // back within three seconds, even if cleanup is blocked or never settles.
    var timer = window.setTimeout(function () {
      complete = false;
      finish();
    }, 3000);
    var finished = false;
    var complete = true;
    function finish() {
      if (finished) return;
      finished = true;
      window.clearTimeout(timer);
      result.textContent = complete
        ? "Đã làm mới. Đang mở lại Mộc…"
        : "Chưa làm mới được toàn bộ bộ nhớ. Đang thử mở lại Mộc…";
      window.location.replace(freshUrl());
    }
    function attempt(task) {
      return Promise.resolve()
        .then(task)
        .catch(function () {
          complete = false;
        });
    }
    Promise.all([
      attempt(function () {
        if (!("serviceWorker" in navigator)) return;
        return navigator.serviceWorker.getRegistrations().then(function (registrations) {
          return Promise.all(
            registrations.map(function (registration) {
              var worker = registration.active || registration.waiting || registration.installing;
              // Update only Moc's worker. Keep its existing push subscription.
              if (
                registration.scope === window.location.origin + "/" &&
                worker &&
                worker.scriptURL === window.location.origin + "/sw.js"
              ) {
                return registration.update();
              }
            })
          );
        });
      }),
      attempt(function () {
        if (!("caches" in window)) return;
        return window.caches.keys().then(function (keys) {
          return Promise.all(
            keys
              .filter(function (key) {
                return key.indexOf("moc-maria-pwa-offline-") === 0;
              })
              .map(function (key) {
                return window.caches.delete(key);
              })
          );
        });
      })
    ]).then(finish, function () {
      complete = false;
      finish();
    });
  });
})();
