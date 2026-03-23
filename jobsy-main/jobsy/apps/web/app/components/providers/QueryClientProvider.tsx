"use client";

/**
 * QueryClientProvider wrapper for React Query / TanStack Query.
 *
 * Install @tanstack/react-query when ready:
 *   npm i @tanstack/react-query
 *
 * This is a stub that renders children so the app doesn't break
 * before the dependency is installed.
 */

import { type ReactNode } from "react";

// Uncomment once @tanstack/react-query is installed:
// import {
//   QueryClient,
//   QueryClientProvider as RQProvider,
// } from "@tanstack/react-query";
//
// const queryClient = new QueryClient({
//   defaultOptions: {
//     queries: {
//       staleTime: 1000 * 60, // 1 minute
//       retry: 1,
//       refetchOnWindowFocus: false,
//     },
//   },
// });

export function AppQueryClientProvider({
  children,
}: {
  children: ReactNode;
}) {
  // Replace with <RQProvider client={queryClient}> once installed
  return <>{children}</>;
}
