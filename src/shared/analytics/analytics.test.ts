import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readdirSync } from "node:fs";

const id = "G-TEST123";
const queue = () =>
  (Reflect.get(window, "dataLayer") as IArguments[]).map((entry) => Array.from(entry));
async function setup(host = "mocmaria.com") {
  vi.resetModules();
  vi.stubGlobal("location", new URL(`https://${host}/`));
  return import("./analytics");
}
beforeEach(() => {
  document.querySelector("#mm-google-analytics")?.remove();
  Reflect.deleteProperty(window, "dataLayer");
  Reflect.deleteProperty(window, "gtag");
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("Mộc Maria all-page analytics", () => {
  it("covers every application page with a known privacy-safe route template", async () => {
    const { analyticsPath } = await setup();
    const pages = readdirSync("src/app", { recursive: true, encoding: "utf8" })
      .map((file) => file.replaceAll("\\", "/"))
      .filter((file) => /(^|\/)page\.tsx$/.test(file));
    expect(pages.length).toBeGreaterThan(35);
    for (const page of pages) {
      const route =
        "/" + page.replace(/(^|\/)page\.tsx$/, "").replace(/\[[^\]]+\]/g, "private-record");
      expect(analyticsPath(route), page).not.toBe("/other");
      expect(analyticsPath(route), page).not.toContain("private-record");
    }
  });
  it("loads one asynchronous tag and counts initial, SPA navigation and revisits once", async () => {
    const analytics = await setup();
    analytics.trackAnalyticsPage("/", id);
    analytics.trackAnalyticsPage("/", id);
    analytics.trackAnalyticsPage("/dat-lich", id);
    analytics.trackAnalyticsPage("/dat-lich", id);
    analytics.trackAnalyticsPage("/", id);
    expect(document.querySelectorAll("#mm-google-analytics")).toHaveLength(1);
    expect((document.querySelector("#mm-google-analytics") as HTMLScriptElement).async).toBe(true);
    expect(
      queue().filter(([type, event]) => type === "event" && event === "page_view"),
    ).toHaveLength(3);
    expect(queue().find(([type]) => type === "config")).toEqual([
      "config",
      id,
      expect.objectContaining({
        send_page_view: false,
        allow_google_signals: false,
        allow_ad_personalization_signals: false,
        cookie_domain: "mocmaria.com",
      }),
    ]);
  });
  it("keeps dynamic records, private query parameters, document titles and raw referrers out of analytics", async () => {
    const analytics = await setup();
    document.title = "Private customer name";
    vi.spyOn(document, "referrer", "get").mockReturnValue(
      "https://www.facebook.com/private-person?token=private#secret",
    );
    analytics.trackAnalyticsPage(
      "/quan-tri/ktv/private-customer-id?email=private@example.com#secret",
      id,
    );
    const calls = queue();
    const event = calls.find(([type]) => type === "event");
    expect(event?.[2]).toMatchObject({
      page_location: "https://mocmaria.com/quan-tri/ktv/:id",
      page_title: "admin · /quan-tri/ktv/:id",
      page_referrer: "https://www.facebook.com/",
      page_area: "admin",
    });
    expect(JSON.stringify(calls)).not.toMatch(/private|Private|secret|example\.com/);
    expect(analytics.analyticsPath("/dich-vu/massage-body")).toBe("/dich-vu/:slug");
    expect(analytics.analyticsPath("/chuyen-vien/provider-record-id")).toBe("/chuyen-vien/:id");
    expect(analytics.analyticsPath("/unknown/private-record")).toBe("/other");
  });
  it("reports event and main pages with the same property, while separating areas", async () => {
    const analytics = await setup("event.mocmaria.com");
    analytics.trackAnalyticsPage("/", id);
    expect(queue().find(([type]) => type === "event")?.[2]).toMatchObject({
      page_location: "https://event.mocmaria.com/",
      page_area: "event",
      send_to: id,
    });
    vi.stubGlobal("location", new URL("https://mocmaria.com/tin-nhan?conversation=private"));
    analytics.trackAnalyticsPage("/tin-nhan", id);
    expect(
      queue()
        .filter(([type]) => type === "event")
        .at(-1)?.[2],
    ).toMatchObject({ page_area: "account" });
  });
  it("does not load tracking on local/preview hosts or with a missing/invalid ID", async () => {
    const analytics = await setup("preview.vercel.app");
    analytics.trackAnalyticsPage("/", id);
    vi.stubGlobal("location", new URL("https://localhost/"));
    analytics.trackAnalyticsPage("/", id);
    vi.stubGlobal("location", new URL("https://mocmaria.com/"));
    analytics.trackAnalyticsPage("/", undefined);
    analytics.trackAnalyticsPage("/", "invalid-id");
    expect(document.querySelector("#mm-google-analytics")).toBeNull();
    expect(Reflect.get(window, "dataLayer")).toBeUndefined();
  });
  it("never interrupts customer actions when loading or calling the tag fails", async () => {
    const analytics = await setup();
    vi.spyOn(document.head, "appendChild").mockImplementation(() => {
      throw new Error("Blocked");
    });
    expect(() => analytics.trackAnalyticsPage("/", id)).not.toThrow();
    Reflect.set(window, "gtag", () => {
      throw new Error("Blocked");
    });
    expect(() => analytics.trackAnalyticsPage("/dat-lich", id)).not.toThrow();
  });
});
