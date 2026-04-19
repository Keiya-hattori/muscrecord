import Link from "next/link";
import clsx from "clsx";

const links = [
  { href: "/", label: "ホーム" },
  { href: "/suggest", label: "メニュー提案" },
  { href: "/history", label: "種目別記録" },
  { href: "/progress", label: "グラフ・称号" },
] as const;

export type NavHref = (typeof links)[number]["href"] | "/settings";

export function AppNav({ current }: { current?: NavHref }) {
  return (
    <nav className="sticky top-0 z-30 border-b border-zinc-200/70 bg-white/60 backdrop-blur-md dark:border-white/10 dark:bg-zinc-950/50">
      <div className="mx-auto flex max-w-lg items-center gap-2 overflow-x-auto px-4 py-3">
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className={clsx(
              "min-w-fit rounded-full px-4 py-2 text-sm font-medium transition-colors",
              current === l.href
                ? "bg-violet-600/90 text-white shadow-sm shadow-violet-500/25 dark:bg-violet-500/70"
                : "text-zinc-700 hover:bg-zinc-200/70 dark:text-zinc-300 dark:hover:bg-white/10",
            )}
          >
            {l.label}
          </Link>
        ))}
        <Link
          href="/settings"
          className={clsx(
            "min-w-fit rounded-full px-4 py-2 text-sm font-medium transition-colors",
            current === "/settings"
              ? "bg-violet-600/90 text-white shadow-sm shadow-violet-500/25 dark:bg-violet-500/70"
              : "text-zinc-700 hover:bg-zinc-200/70 dark:text-zinc-300 dark:hover:bg-white/10",
          )}
        >
          設定
        </Link>
      </div>
    </nav>
  );
}
