"use client";

import { type ReactNode } from "react";
import { ToastProvider as ToastProviderBase } from "../ui/Toast";

export function AppToastProvider({ children }: { children: ReactNode }) {
  return <ToastProviderBase>{children}</ToastProviderBase>;
}
