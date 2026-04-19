import Link from "next/link";
import clsx from "clsx";

const links = [
  { href: "/", label: "ホーム" },
  { href: "/history", label: "種目別記録" },
  { href: "/progress", label: "グラフ・称号" },
] as const;

export type NavHref = (typeof links)[number]["href"] | "/settings";

export function AppNav({ current }: { current?: NavHref }) {
  return (
    <nav className="flex flex-wrap justify-center gap-2 border-b border-zinc-200 bg-white/80 px-4 py-3 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/80">
      {links.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          className={clsx(
            "rounded-full px-4 py-2 text-sm font-medium transition",
            current === l.href
              ? "bg-blue-600 text-white"
              : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800",
          )}
        >
          {l.label}
        </Link>
      ))}
      <Link
        href="/settings"
        className={clsx(
          "rounded-full px-4 py-2 text-sm font-medium transition",
          current === "/settings"
            ? "bg-blue-600 text-white"
            : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800",
        )}
      >
        設定
      </Link>
    </nav>
  );
}
