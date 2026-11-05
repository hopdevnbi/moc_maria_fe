const HOSTS = new Set(["mocmaria.com", "www.mocmaria.com", "event.mocmaria.com"]);
const STATIC_PATHS = new Set([
  "/",
  "/bang-gia",
  "/cam-truy-cap",
  "/chuyen-vien",
  "/check-in",
  "/dang-ky",
  "/dang-nhap",
  "/dat-lai-mat-khau",
  "/dat-lich",
  "/dich-vu",
  "/event",
  "/hoi-vien",
  "/lich-hen",
  "/nhan-qua",
  "/quen-mat-khau",
  "/tai-khoan",
  "/tin-nhan",
  "/tro-thanh-ktv",
  "/ktv/an-toan",
  "/ktv/dao-tao",
  "/ktv/ho-so",
  "/quan-tri",
  "/quan-tri/an-toan-ktv",
  "/quan-tri/cham-cong",
  "/quan-tri/co-so",
  "/quan-tri/danh-gia-ktv",
  "/quan-tri/dich-vu",
  "/quan-tri/ho-so",
  "/quan-tri/hoi-vien-vip",
  "/quan-tri/khach-hang",
  "/quan-tri/ktv",
  "/quan-tri/lich-hen",
  "/quan-tri/mo-ta-ktv",
  "/quan-tri/phan-quyen",
  "/quan-tri/su-kien",
  "/quan-tri/su-kien/bao-cao",
  "/quan-tri/su-kien/van-hanh",
  "/quan-tri/su-kien/voucher",
  "/quan-tri/thong-bao",
  "/quan-tri/zalo",
]);

type TagWindow = Window & { dataLayer?: unknown[]; gtag?: (...args: unknown[]) => void };
let initializedId = "";
let lastNavigation = "";
let previousLocation = "";

/** Only known route templates leave the browser; never IDs, search terms or tokens. */
export function analyticsPath(value: string): string {
  const path = value.split(/[?#]/, 1)[0].replace(/\/+$/, "") || "/";
  if (STATIC_PATHS.has(path)) return path;
  if (/^\/chuyen-vien\/[^/]+$/.test(path)) return "/chuyen-vien/:id";
  if (/^\/dich-vu\/[^/]+$/.test(path)) return "/dich-vu/:slug";
  if (/^\/quan-tri\/ktv\/[^/]+$/.test(path)) return "/quan-tri/ktv/:id";
  return "/other";
}

function tag(...args: unknown[]) {
  try {
    (window as TagWindow).gtag?.(...args);
  } catch {
    /* Tracking failures must never block the website. */
  }
}

function safeReferrer() {
  try {
    const url = new URL(document.referrer);
    return url.protocol === "https:" &&
      /(^|\.)(google\.[a-z.]+|bing\.com|facebook\.com|zalo\.me|mocmaria\.com)$/.test(url.hostname)
      ? url.origin + "/"
      : "";
  } catch {
    return "";
  }
}

export function trackAnalyticsPage(pathname: string, measurementId: string | undefined) {
  if (
    !measurementId ||
    !/^G-[A-Z0-9]+$/.test(measurementId) ||
    !HOSTS.has(window.location.hostname)
  )
    return;
  const navigation = window.location.hostname + ":" + pathname;
  if (navigation === lastNavigation) return;
  const path = analyticsPath(pathname);
  const area =
    window.location.hostname === "event.mocmaria.com"
      ? "event"
      : path.startsWith("/quan-tri")
        ? "admin"
        : path.startsWith("/ktv/")
          ? "ktv"
          : ["/tai-khoan", "/tin-nhan", "/lich-hen", "/check-in"].includes(path)
            ? "account"
            : "public";
  const parameters = {
    page_location: window.location.origin + path,
    page_title: area + " · " + path,
    page_referrer: previousLocation || safeReferrer(),
    page_area: area,
  };
  if (!initializedId) {
    initializedId = measurementId;
    const target = window as TagWindow;
    target.dataLayer ??= [];
    target.gtag = function () {
      // Google's queue expects Arguments objects, not plain data objects.
      // eslint-disable-next-line prefer-rest-params
      target.dataLayer?.push(arguments);
    };
    tag("consent", "default", {
      analytics_storage: "granted",
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied",
    });
    tag("set", "ads_data_redaction", true);
    tag("set", "url_passthrough", false);
    tag("js", new Date());
    tag("config", measurementId, {
      send_page_view: false,
      allow_google_signals: false,
      allow_ad_personalization_signals: false,
      cookie_domain: "mocmaria.com",
      cookie_expires: 60 * 60 * 24 * 30,
      ...parameters,
    });
    const script = document.createElement("script");
    script.id = "mm-google-analytics";
    script.async = true;
    script.referrerPolicy = "strict-origin";
    script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
    try {
      document.head.appendChild(script);
    } catch {
      /* Content blockers do not affect customer flows. */
    }
  }
  tag("set", parameters);
  tag("event", "page_view", { ...parameters, send_to: initializedId });
  lastNavigation = navigation;
  previousLocation = parameters.page_location;
}
