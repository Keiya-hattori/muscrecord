"use client";

import { AppNav } from "@/components/AppNav";
import { ProfileSettingsSection } from "@/components/ProfileSettingsSection";
import { SeedTestDataSection } from "@/components/SeedTestDataSection";

export default function SettingsPage() {
  return (
    <div className="min-h-screen">
      <AppNav current="/settings" />
      <div className="mx-auto max-w-lg px-4 py-10">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
          設定
        </h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          メニュー提案の精度に使う情報です。記録データ本体は端末のみに保存され、ここで入力した内容は「メニュー提案」実行時のみサーバーへ送られます。
        </p>

        <ProfileSettingsSection />
        <SeedTestDataSection />
      </div>
    </div>
  );
}
