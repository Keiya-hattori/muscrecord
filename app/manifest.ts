import type { MetadataRoute } from "next";

export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  /**
   * GitHub Pages のプロジェクトサイトでは manifest が /repo/manifest.webmanifest に置かれる。
   * start_url が "/" だとオリジン直下（/repo ではなく user.github.io/）に解決され、
   * 「ホーム画面に追加」からの起動だけ別URLになって 404 になる。
   * マニフェストURL基準の相対パスにする。
   */
  return {
    name: "筋トレ記録",
    short_name: "筋トレ",
    description: "種目画像からワンタップ記録・LLMが今日のメニューを提案",
    start_url: "./",
    scope: "./",
    /** standalone だとホーム画面から全画面起動になり環境によって不具合が出るため、通常の Safari 相当で開く */
    display: "browser",
    background_color: "#fafafa",
    theme_color: "#2563eb",
    orientation: "portrait",
    icons: [
      {
        src: "./icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "./icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
