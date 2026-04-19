import clsx from "clsx";

type Props = {
  label: string;
  onClick: () => void;
  className?: string;
};

export function StepChip({ label, onClick, className }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        "min-h-[44px] min-w-[44px] rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm font-semibold text-zinc-800 shadow-sm active:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:active:bg-zinc-700",
        className,
      )}
    >
      {label}
    </button>
  );
}
