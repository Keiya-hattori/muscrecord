import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { SerwistRegister } from "@/components/SerwistRegister";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const APP_NAME = "筋トレ記録";

export const metadata: Metadata = {
  applicationName: APP_NAME,
  title: {
    default: APP_NAME,
    template: `%s · ${APP_NAME}`,
  },
  description:
    "種目画像からワンタップで記録。過去の結果をもとにLLMが今日のメニューを提案します。",
  /** apple-mobile-web-app-capable を出さない（ホーム画面からも Safari 相当の UI で開く） */
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: "#2563eb",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body
        className={`${geistSans.variable} ${geistMono.variable} min-h-screen antialiased overflow-x-hidden text-zinc-900 dark:text-zinc-50`}
      >
        <SerwistRegister>{children}</SerwistRegister>
      </body>
    </html>
  );
}
