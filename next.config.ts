import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";
import { randomUUID } from "node:crypto";

/** GitHub Pages（静的エクスポート）向けビルド */
const isGhPages = process.env.GITHUB_PAGES === "true";

const rawBase = process.env.BASE_PATH?.trim();
const basePath =
  rawBase && rawBase !== "/"
    ? rawBase.startsWith("/")
      ? rawBase
      : `/${rawBase}`
    : undefined;

const revision = randomUUID();

const withSerwist = withSerwistInit({
  swSrc: "app/sw.ts",
  swDest: "public/sw.js",
  disable:
    process.env.NODE_ENV === "development" || isGhPages,
  additionalPrecacheEntries: isGhPages
    ? []
    : [{ url: "/~offline", revision }],
});

const nextConfig: NextConfig = {
  reactStrictMode: true,
  ...(isGhPages
    ? {
        output: "export" as const,
        images: { unoptimized: true },
      }
    : {}),
  ...(basePath ? { basePath, assetPrefix: basePath } : {}),
};

export default isGhPages ? nextConfig : withSerwist(nextConfig);
