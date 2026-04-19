export default function OfflinePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
        オフラインです
      </h1>
      <p className="max-w-md text-sm text-zinc-600 dark:text-zinc-400">
        ネット接続を確認してから再度お試しください。
      </p>
    </main>
  );
}
