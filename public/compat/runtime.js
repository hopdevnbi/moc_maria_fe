/* Parser-safe bootstrap for older Safari; optional browser APIs never block auth. */
(function () {
  "use strict";
  if (typeof AbortController !== "undefined" && typeof AbortSignal !== "undefined") {
    if (typeof AbortSignal.timeout !== "function") {
      AbortSignal.timeout = function (milliseconds) {
        var controller = new AbortController();
        setTimeout(function () {
          controller.abort();
        }, milliseconds);
        return controller.signal;
      };
    }
    if (typeof AbortSignal.any !== "function") {
      AbortSignal.any = function (signals) {
        var controller = new AbortController(),
          subscribed = [];
        function abort() {
          controller.abort();
          subscribed.forEach(function (signal) {
            signal.removeEventListener("abort", abort);
          });
          subscribed = [];
        }
        signals.forEach(function (signal) {
          if (controller.signal.aborted) return;
          if (signal.aborted) {
            abort();
            return;
          }
          signal.addEventListener("abort", abort, { once: true });
          subscribed.push(signal);
        });
        return controller.signal;
      };
    }
  }
})();
