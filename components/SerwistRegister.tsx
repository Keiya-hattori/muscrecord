"use client";

import { SerwistProvider } from "@serwist/next/react";

export function SerwistRegister({ children }: { children: React.ReactNode }) {
  const isProd = process.env.NODE_ENV === "production";

  return (
    <SerwistProvider
      swUrl="/sw.js"
      register={isProd}
      cacheOnNavigation={isProd}
      reloadOnOnline={isProd}
    >
      {children}
    </SerwistProvider>
  );
}
