import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { parse } from "acorn";
import { afterEach, describe, expect, it, vi } from "vitest";
import { waitFor } from "@testing-library/react";
import { IOS_COMPATIBILITY_SCRIPT } from "./ios-compatibility";

const html = readFileSync("public/compat/index.html", "utf8");
const script = readFileSync("public/compat/app.js", "utf8");
const runtime = readFileSync("public/compat/runtime.js", "utf8");
const provider = "11111111-1111-4111-8111-111111111111";
const customer = {
  id: "customer",
  displayName: "Khách",
  isActive: true,
  roles: ["CUSTOMER"],
  permissions: ["customer.portal"],
};
const auth = { accessToken: "test-token", user: customer };
const catalog = {
  apiBase: "https://api.mocmaria.com/api/v1",
  address: "Địa chỉ cơ sở đã công khai",
  providers: [
    { id: provider, name: "KTV <script>", services: [{ id: "service", name: "Chăm sóc" }] },
  ],
};

class Xhr {
  static sent: Xhr[] = [];
  url = "";
  method = "";
  body: Record<string, string> | null = null;
  headers: Record<string, string> = {};
  withCredentials = false;
  timeout = 0;
  status = 0;
  responseText = "";
  onload = () => {};
  ontimeout = () => {};
  onerror = () => {};
  open(method: string, url: string) {
    this.method = method;
    this.url = url;
  }
  setRequestHeader(key: string, value: string) {
    this.headers[key] = value;
  }
  send(body: string | null) {
    this.body = body ? JSON.parse(body) : null;
    Xhr.sent.push(this);
  }
  respond(status: number, body: unknown) {
    this.status = status;
    this.responseText = JSON.stringify(body);
    this.onload();
  }
}
function start() {
  document.documentElement.innerHTML = html;
  Xhr.sent = [];
  runInNewContext(script, {
    document,
    window: {
      location: { hostname: "mocmaria.com", hash: "" },
      crypto: { getRandomValues: (bytes: Uint8Array) => crypto.getRandomValues(bytes) },
    },
    XMLHttpRequest: Xhr,
    Promise,
    Date,
    Uint8Array,
  });
}
function req(path: string) {
  const rows = Xhr.sent.filter((r) => r.url.endsWith(path));
  return rows[rows.length - 1];
}
function input(id: string, value: string) {
  (document.getElementById(id) as HTMLInputElement).value = value;
}
function submit(id: string) {
  document
    .getElementById(id)!
    .dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
}
async function ready() {
  start();
  req("/api/compat/catalog").respond(200, catalog);
  req("/auth/refresh").respond(200, auth);
  await waitFor(() =>
    expect(document.getElementById("session-status")!.textContent).toContain("Khách"),
  );
}
async function booking() {
  await ready();
  input("provider", provider);
  document.getElementById("provider")!.dispatchEvent(new Event("change"));
  input("service", "service");
  input("requested-at", new Date(Date.now() + 7 * 3600000 + 3600000).toISOString().slice(0, 16));
}
afterEach(() => {
  vi.useRealTimers();
  document.body.innerHTML = "";
  document.body.removeAttribute("data-moc-auth-settled");
});

describe("basic account and booking without the modern application", () => {
  it("keeps all standalone scripts parsable by ES5 engines", () => {
    for (const source of [
      script,
      runtime,
      IOS_COMPATIBILITY_SCRIPT,
      readFileSync("public/pwa/recover.js", "utf8"),
    ])
      expect(() => parse(source, { ecmaVersion: 5 })).not.toThrow();
  });
  it("restores authentication independently when the catalog hangs", async () => {
    start();
    req("/auth/refresh").respond(200, auth);
    await waitFor(() =>
      expect(document.getElementById("session-status")!.textContent).toContain("Khách"),
    );
    expect(req("/auth/refresh").withCredentials).toBe(true);
    expect(req("/auth/refresh").timeout).toBe(15000);
  });
  it("uses POST forms so a script failure cannot put a password in a URL", () => {
    start();
    for (const form of document.querySelectorAll("form")) expect(form.method).toBe("post");
  });
  it("allows login while bootstrap is pending and ignores a late old session", async () => {
    start();
    input("identifier", "customer@example.invalid");
    input("login-password", "CorrectPass123");
    submit("login-form");
    expect(req("/auth/login").body).toEqual({
      identifier: "customer@example.invalid",
      password: "CorrectPass123",
    });
    req("/auth/login").respond(200, auth);
    await waitFor(() =>
      expect(document.getElementById("session-status")!.textContent).toContain("Khách"),
    );
    req("/auth/refresh").respond(401, { message: "expired" });
    await Promise.resolve();
    expect(document.getElementById("session-status")!.textContent).toContain("Khách");
    expect((document.getElementById("login-password") as HTMLInputElement).value).toBe("");
  });
  it("registers with the existing API contract and does not trim passwords", async () => {
    start();
    input("display-name", "Khách mới");
    input("phone", "0901234567");
    input("register-password", " CorrectPass123 ");
    submit("register-form");
    expect(req("/auth/register").body).toEqual({
      displayName: "Khách mới",
      phone: "0901234567",
      password: " CorrectPass123 ",
    });
    req("/auth/register").respond(200, auth);
    await waitFor(() =>
      expect(document.getElementById("session-status")!.textContent).toContain("Khách"),
    );
  });
  it("keeps login usable after a session request times out", async () => {
    start();
    req("/auth/refresh").ontimeout();
    await waitFor(() =>
      expect(document.getElementById("session-status")!.textContent).toContain("Chưa kiểm tra"),
    );
    expect((document.querySelector("#login-form button") as HTMLButtonElement).disabled).toBe(
      false,
    );
  });
  it("does not inject HTML from public provider names", async () => {
    await ready();
    expect(document.querySelector("#provider option:last-child")!.textContent).toBe("KTV <script>");
    expect(document.querySelector("#provider script")).toBeNull();
  });
  it("preserves the idempotency key after an uncertain booking response", async () => {
    await booking();
    submit("booking-form");
    const first = req("/appointment-inquiries");
    expect(first.body).toMatchObject({
      providerId: provider,
      serviceId: "service",
      location: "AT_BRANCH",
      address: catalog.address,
    });
    expect(first.headers.Authorization).toBe("Bearer test-token");
    expect(first.body!.idempotencyKey).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4/);
    first.ontimeout();
    await waitFor(() =>
      expect((document.getElementById("send-booking") as HTMLButtonElement).disabled).toBe(false),
    );
    submit("booking-form");
    expect(req("/appointment-inquiries").body).toEqual(first.body);
  });
  it("never sends a duplicate while a booking is pending", async () => {
    await booking();
    submit("booking-form");
    submit("booking-form");
    expect(Xhr.sent.filter((r) => r.url.endsWith("/appointment-inquiries"))).toHaveLength(1);
  });
  it("refreshes expired access before retrying the same request", async () => {
    await booking();
    submit("booking-form");
    const first = req("/appointment-inquiries");
    first.respond(401, {});
    await waitFor(() =>
      expect(Xhr.sent.filter((r) => r.url.endsWith("/auth/refresh"))).toHaveLength(2),
    );
    req("/auth/refresh").respond(200, { ...auth, accessToken: "new-token" });
    await waitFor(() =>
      expect(Xhr.sent.filter((r) => r.url.endsWith("/appointment-inquiries"))).toHaveLength(2),
    );
    expect(req("/appointment-inquiries").body).toEqual(first.body);
    expect(req("/appointment-inquiries").headers.Authorization).toBe("Bearer new-token");
  });
  it("clears private content on logout and ignores a late list response", async () => {
    await ready();
    document.getElementById("load-requests")!.click();
    const listing = req("/appointment-inquiries");
    document.getElementById("logout")!.click();
    req("/auth/logout").respond(204, null);
    await waitFor(() =>
      expect(document.getElementById("session-status")!.textContent).toContain("chưa đăng nhập"),
    );
    listing.respond(200, [
      {
        customerId: customer.id,
        providerName: "Private",
        serviceName: "Private",
        requestedAt: new Date().toISOString(),
        status: "PENDING",
      },
    ]);
    await Promise.resolve();
    expect(document.getElementById("request-list")!.textContent).toBe("");
  });
});

describe("startup recovery on an old iPhone", () => {
  it.each([false, true])("switches only if hydration is still stuck (settled: %s)", (settled) => {
    vi.useFakeTimers();
    document.body.innerHTML = "";
    if (settled) document.body.setAttribute("data-moc-auth-settled", "");
    const replace = vi.fn();
    runInNewContext(IOS_COMPATIBILITY_SCRIPT, {
      document,
      navigator: { userAgent: "iPhone OS 16_1 like Mac OS X" },
      window: { setTimeout, location: { pathname: "/dat-lich", replace } },
    });
    vi.advanceTimersByTime(18000);
    if (settled) expect(replace).not.toHaveBeenCalled();
    else expect(replace).toHaveBeenCalledWith("/compat/index.html#booking");
  });
  it("does not interrupt someone typing a form", () => {
    vi.useFakeTimers();
    document.body.innerHTML = '<input id="typing">';
    (document.getElementById("typing") as HTMLInputElement).focus();
    const replace = vi.fn();
    runInNewContext(IOS_COMPATIBILITY_SCRIPT, {
      document,
      navigator: { userAgent: "iPhone OS 16_1 like Mac OS X" },
      window: { setTimeout, location: { pathname: "/dang-nhap", replace } },
    });
    vi.advanceTimersByTime(18000);
    expect(replace).not.toHaveBeenCalled();
  });
  it("installs missing abort helpers without replacing native ones", () => {
    vi.useFakeTimers();
    class Signal extends EventTarget {
      aborted = false;
    }
    class Controller {
      signal = new Signal();
      abort() {
        this.signal.aborted = true;
        this.signal.dispatchEvent(new Event("abort"));
      }
    }
    const api = Signal as typeof Signal & {
      timeout: (ms: number) => Signal;
      any: (signals: Signal[]) => Signal;
    };
    runInNewContext(runtime, { AbortController: Controller, AbortSignal: api, setTimeout });
    const timeout = api.timeout(8000);
    vi.advanceTimersByTime(8000);
    expect(timeout.aborted).toBe(true);
    const parent = new Controller();
    const joined = api.any([parent.signal]);
    parent.abort();
    expect(joined.aborted).toBe(true);
    const native = api.any;
    runInNewContext(runtime, { AbortController: Controller, AbortSignal: api, setTimeout });
    expect(api.any).toBe(native);
  });
});
