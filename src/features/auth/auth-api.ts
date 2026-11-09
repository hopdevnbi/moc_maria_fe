import { resolveApiBaseUrl } from "@/shared/config/environment";

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export class AuthRequestTimeoutError extends Error {
  constructor() {
    super("Không thể kết nối để kiểm tra phiên đăng nhập. Vui lòng thử lại.");
    this.name = "AuthRequestTimeoutError";
  }
}

// Safari can leave a fetch (or its response body) pending indefinitely. A
// deadline around the whole request keeps the app from being stuck on auth.
export async function withAuthRequestDeadline<T>(
  task: (signal: AbortSignal) => Promise<T>,
  timeoutMs = 12_000,
): Promise<T> {
  const controller = new AbortController();
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_, reject) => {
    timeout = setTimeout(() => {
      controller.abort();
      reject(new AuthRequestTimeoutError());
    }, timeoutMs);
  });
  try {
    return await Promise.race([task(controller.signal), deadline]);
  } finally {
    if (timeout !== undefined) clearTimeout(timeout);
  }
}

export async function apiRequest(
  path: string,
  init: RequestInit = {},
  accessToken?: string | null,
): Promise<Response> {
  const headers = new Headers(init.headers);
  if (accessToken) {
    headers.set("Authorization", "Bearer " + accessToken);
  }

  return fetch(resolveApiBaseUrl() + path, {
    ...init,
    headers,
    credentials: "include",
  });
}

export async function parseApiResponse<T>(response: Response): Promise<T> {
  if (response.status === 204) return undefined as T;

  const contentType = response.headers.get("content-type") ?? "";
  const payload = contentType.includes("application/json")
    ? ((await response.json()) as unknown)
    : await response.text();

  if (!response.ok) {
    const body = payload as { message?: unknown } | null;
    const message =
      body && typeof body === "object" && typeof body.message === "string"
        ? body.message
        : "Yêu cầu chưa thể hoàn tất.";
    throw new ApiError(response.status, message, payload);
  }

  return payload as T;
}
