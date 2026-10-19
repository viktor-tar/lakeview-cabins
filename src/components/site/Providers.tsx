"use client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { DialogProvider } from "./DialogProvider";

export function Providers({ children }: { children: ReactNode }) {
  // One client per browser session (created lazily so it isn't shared between server requests).
  const [client] = useState(
    () =>
      new QueryClient({ defaultOptions: { queries: { staleTime: 30_000, refetchOnWindowFocus: false, retry: 1 } } }),
  );
  return (
    <QueryClientProvider client={client}>
      <DialogProvider>{children}</DialogProvider>
    </QueryClientProvider>
  );
}
