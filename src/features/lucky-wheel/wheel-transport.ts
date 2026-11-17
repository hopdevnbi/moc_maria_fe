import { ApiError } from "@/features/auth/auth-api";
import type { AuthContextValue } from "@/features/auth/context/AuthContext";
import type { WheelBetInput } from "./lucky-wheel";
export interface WheelTransport {
  read(signal: AbortSignal): Promise<Response>;
  place(input: WheelBetInput, signal: AbortSignal): Promise<Response>;
}
/** Use Mộc's refresh-aware auth transport; never persist a second token. */
export function accountWheelTransport(authFetch: AuthContextValue["authFetch"]): WheelTransport {
  const request = async (path: string, init: RequestInit) => {
    try {
      const value = await authFetch(path, { ...init, cache: "no-store" });
      return new Response(JSON.stringify(value), {
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      if (!(error instanceof ApiError)) throw error;
      return new Response(JSON.stringify({ message: error.message }), { status: error.status });
    }
  };
  return {
    read: (signal) => request("/games/wheel", { signal }),
    place: (input, signal) =>
      request("/games/wheel/bets", {
        signal,
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      }),
  };
}
