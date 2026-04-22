import type { TaskRewardStatus } from "@/lib/task-rewards/dashboard-data";

export function getTaskStatusToneClasses(status: TaskRewardStatus): string {
  if (status === "claimed" || status === "completed") {
    return "border-emerald-200 bg-emerald-50/80 dark:border-emerald-900/60 dark:bg-emerald-950/20";
  }

  if (status === "claimable") {
    return "border-amber-200 bg-amber-50/80 dark:border-amber-900/60 dark:bg-amber-950/20";
  }

  return "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950/60";
}

export function getTaskIconToneClasses({
  completed,
  claimable,
}: {
  completed: boolean;
  claimable: boolean;
}): string {
  if (completed) {
    return "bg-emerald-500 text-white dark:bg-emerald-500/20 dark:text-emerald-300";
  }

  if (claimable) {
    return "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300";
  }

  return "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300";
}

export function getMetricToneClasses(tone: "amber" | "emerald"): string {
  return tone === "amber"
    ? "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300"
    : "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300";
}
