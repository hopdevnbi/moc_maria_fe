"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { AuthProvider } from "@/features/auth/context/AuthProvider";
import { GlobalContactActions } from "@/shared/contact/global-contact-actions";
import { PwaInstallAssistant } from "@/shared/pwa/pwa-install-assistant";
import { ChatNotificationListener } from "@/features/mobile/chat-notifications";

export function AppProviders({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        {children}
        <GlobalContactActions />
        <PwaInstallAssistant />
        <ChatNotificationListener />
      </AuthProvider>
    </QueryClientProvider>
  );
}
