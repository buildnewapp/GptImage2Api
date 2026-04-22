import { Coins } from "lucide-react";

interface UserCreditBadgeProps {
  totalAvailableCredits?: number | null;
}

export function UserCreditBadge({
  totalAvailableCredits,
}: UserCreditBadgeProps) {
  const value = totalAvailableCredits;

  if (!value) {
    return null;
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground align-middle">
      <Coins className="h-3 w-3" />
      <span>{value}</span>
    </span>
  );
}
