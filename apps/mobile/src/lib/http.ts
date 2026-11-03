const productionBase = 'https://api.mocmaria.com/api/v1';
export const API_BASE_URL = (process.env.EXPO_PUBLIC_API_BASE_URL || productionBase).replace(/\/$/, '');

if (!/^https:\/\//i.test(API_BASE_URL) && !__DEV__) {
  throw new Error('Production API must use HTTPS');
}
export class ApiError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}
export interface HttpOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  token?: string | null;
  headers?: Record<string, string>;
  signal?: AbortSignal;
  timeoutMs?: number;
}
export async function apiFetch<T>(path: string, options: HttpOptions = {}): Promise<T> {
  if (!path.startsWith('/') || path.startsWith('//')) {
    throw new Error('API path must be relative and start with /');
  }
  const { method = 'GET', body, token, signal, timeoutMs = 15000, headers: custom = {} } = options;
  const controller = new AbortController();
  let expired = false;
  const timeout = setTimeout(() => {
    expired = true;
    controller.abort();
  }, timeoutMs);
  const onAbort = () => controller.abort();
  if (signal?.aborted) controller.abort();
  signal?.addEventListener('abort', onAbort, { once: true });
  try {
    const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
    const headers: Record<string, string> = { Accept: 'application/json', ...custom };
    if (token) headers.Authorization = 'Bearer ' + token;
    if (body !== undefined && !isFormData) headers['Content-Type'] = 'application/json';
    const response = await fetch(API_BASE_URL + path, {
      method,
      headers,
      body: body === undefined ? undefined : isFormData ? body as BodyInit : JSON.stringify(body),
      credentials: 'omit',
      signal: controller.signal,
    });
    if (response.status === 204) return undefined as T;
    const contentType = response.headers.get('content-type') || '';
    const payload: unknown = contentType.includes('application/json')
      ? await response.json()
      : await response.text();
    if (!response.ok) {
      const serverText = typeof payload === 'object' && payload !== null && 'message' in payload
        ? (payload as { message?: unknown }).message : null;
      const message = typeof serverText === 'string' ? serverText
        : response.status === 401 ? 'Phiên đăng nhập đã hết hạn.'
        : response.status === 403 ? 'Bạn không có quyền thực hiện thao tác này.'
        : response.status === 429 ? 'Bạn đang thao tác quá nhanh. Hãy thử lại sau.'
        : 'Chưa thể kết nối với dịch vụ. Vui lòng thử lại.';
      throw new ApiError(response.status, message);
    }
    return payload as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (expired) throw new ApiError(408, 'Kết nối quá thời gian. Vui lòng thử lại.');
    if (controller.signal.aborted) throw error;
    throw new ApiError(503, 'Chưa kết nối được máy chủ. Hãy kiểm tra Internet.');
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener('abort', onAbort);
  }
}

export function formatPrice(amount: string | number | undefined): string {
  const numeric = Number(amount ?? 0);
  return Number.isFinite(numeric) ? new Intl.NumberFormat('vi-VN').format(numeric) + ' đ' : 'Liên hệ';
}
export function formatTime(iso: string | undefined): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (!Number.isFinite(date.getTime())) return '';
  return new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh', day: '2-digit', month: '2-digit',
    year: 'numeric', hour: '2-digit', minute: '2-digit',
  }).format(date);
}
