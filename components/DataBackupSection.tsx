"use client";

import { useCallback, useState } from "react";
import {
  BACKUP_FORMAT_VERSION,
  exportAllDataJson,
  importAllDataFromJson,
} from "@/lib/dataBackup";

export function DataBackupSection() {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const onExport = useCallback(async () => {
    setBusy(true);
    setMessage(null);
    try {
      const json = await exportAllDataJson();
      const blob = new Blob([json], { type: "application/json;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const d = new Date();
      const pad = (n: number) => String(n).padStart(2, "0");
      a.href = url;
      a.download = `muscrecord-backup-${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setMessage("エクスポートしました（ダウンロードフォルダを確認してください）。");
    } catch (e) {
      setMessage(
        e instanceof Error ? e.message : "エクスポートに失敗しました。",
      );
    } finally {
      setBusy(false);
    }
  }, []);

  const onImportFile = useCallback(
    async (file: File | undefined) => {
      if (!file) return;
      if (
        !window.confirm(
          "インポートすると、今の端末のトレーニング記録とアプリ設定が、このファイルの内容で置き換わります。続行しますか？",
        )
      ) {
        return;
      }
      setBusy(true);
      setMessage(null);
      try {
        const text = await file.text();
        await importAllDataFromJson(text);
        setMessage("インポートが完了しました。画面を再読み込みします…");
        window.setTimeout(() => window.location.reload(), 600);
      } catch (e) {
        setMessage(
          e instanceof Error ? e.message : "インポートに失敗しました。",
        );
      } finally {
        setBusy(false);
      }
    },
    [],
  );

  return (
    <section className="mt-10 rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-700 dark:bg-zinc-900">
      <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
        データのバックアップ
      </h2>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        記録は IndexedDB、設定の一部は localStorage にあります。JSON
        形式で端末に保存したり、別端末へ移したりできます（形式 v
        {BACKUP_FORMAT_VERSION}）。
      </p>
      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <button
          type="button"
          disabled={busy}
          onClick={() => void onExport()}
          className="rounded-xl bg-zinc-900 px-4 py-3 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
        >
          JSON をエクスポート
        </button>
        <label className="inline-flex cursor-pointer items-center justify-center rounded-xl border-2 border-dashed border-zinc-300 px-4 py-3 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800">
          JSON をインポート
          <input
            type="file"
            accept="application/json,.json"
            className="sr-only"
            disabled={busy}
            onChange={(e) => {
              void onImportFile(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
        </label>
      </div>
      {message && (
        <p className="mt-3 text-sm text-zinc-700 dark:text-zinc-300">
          {message}
        </p>
      )}
    </section>
  );
}
