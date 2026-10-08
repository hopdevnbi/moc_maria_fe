"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { ApiError } from "@/features/auth/auth-api";

export function usePrivateData<T>(path: string, enabled = true) {
  const { user, authFetch } = useAuth();
  return useQuery({
    queryKey: ["private", user?.id, path],
    queryFn: () => authFetch<T>(path, { cache: "no-store" }),
    enabled: !!user && enabled,
    retry: false,
  });
}
export function usePrivateMutation<T = unknown>() {
  const { authFetch, user } = useAuth();
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({
      path,
      method = "POST",
      body,
    }: {
      path: string;
      method?: string;
      body?: unknown;
    }) =>
      authFetch<T>(path, {
        method,
        headers: { "Content-Type": "application/json" },
        body: body === undefined ? undefined : JSON.stringify(body),
        cache: "no-store",
      }),
    onSuccess: () => client.invalidateQueries({ queryKey: ["private", user?.id] }),
  });
}
export function mutationMessage(error: unknown): string {
  return error instanceof ApiError
    ? error.message
    : "Chưa hoàn tất yêu cầu. Vui lòng kiểm tra kết nối và thử lại.";
}
