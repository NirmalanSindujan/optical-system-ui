import { cn } from "@/lib/cn";
import { Badge } from "@/components/ui/badge";

const splitLensTypeValues = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value
      .flatMap((item) => splitLensTypeValues(item))
      .filter(Boolean);
  }

  if (typeof value !== "string") return [];

  return value
    .split(/[,\|/]+/)
    .map((item) => item.trim())
    .filter(Boolean);
};

interface LensTypeChipsProps {
  value: unknown;
  className?: string;
}

const lensTypeChipClasses: Record<string, string> = {
  UC: "border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-200",
  HMC: "border-sky-300 bg-sky-100 text-sky-700 dark:border-sky-800 dark:bg-sky-950/60 dark:text-sky-200",
  PGHMC: "border-emerald-300 bg-emerald-100 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200",
  PBHMC: "border-rose-300 bg-rose-100 text-rose-700 dark:border-rose-800 dark:bg-rose-950/60 dark:text-rose-200",
  BB: "border-amber-300 bg-amber-100 text-amber-700 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-200",
  PGBB: "border-teal-300 bg-teal-100 text-teal-700 dark:border-teal-800 dark:bg-teal-950/60 dark:text-teal-200"
};

const getLensTypeChipClass = (value: string) =>
  lensTypeChipClasses[value.trim().toUpperCase()] ??
  "border-border bg-muted/60 text-foreground";

function LensTypeChips({ value, className }: LensTypeChipsProps) {
  const chips = splitLensTypeValues(value);

  if (chips.length === 0) {
    return <span className={className}>-</span>;
  }

  return (
    <div className={className ?? "flex flex-wrap gap-1.5"}>
      {chips.map((chip) => (
        <Badge
          key={chip}
          variant="outline"
          className={cn(
            "rounded-full px-2.5 py-0.5 text-[11px] font-semibold tracking-[0.08em]",
            getLensTypeChipClass(chip)
          )}
        >
          {chip}
        </Badge>
      ))}
    </div>
  );
}

export { splitLensTypeValues };
export default LensTypeChips;
