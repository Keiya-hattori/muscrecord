"use client";

import { SerwistProvider } from "@serwist/next/react";

/** 本番のみ読み込む（開発時は SerwistRegister が参照しない → vendor-chunks 不整合を避ける） */
export default function SerwistRegisterProd({
  children,
}: {
  children: React.ReactNode;
}) {
  if (process.env.NEXT_PUBLIC_GITHUB_PAGES === "true") {
    return <>{children}</>;
  }
  return (
    <SerwistProvider
      swUrl="/sw.js"
      register
      cacheOnNavigation
      reloadOnOnline
    >
      {children}
    </SerwistProvider>
  );
}
