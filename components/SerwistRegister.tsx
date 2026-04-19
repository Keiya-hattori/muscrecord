"use client";

import type { ReactNode } from "react";
import dynamic from "next/dynamic";

const SerwistProd = dynamic(() => import("./SerwistRegister.prod"), {
  ssr: true,
});

export function SerwistRegister({ children }: { children: ReactNode }) {
  if (process.env.NODE_ENV !== "production") {
    return <>{children}</>;
  }
  return <SerwistProd>{children}</SerwistProd>;
}
