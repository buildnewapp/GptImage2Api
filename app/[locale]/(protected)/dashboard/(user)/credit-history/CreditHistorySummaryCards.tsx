import type { CreditHistorySummaryItem } from "@/lib/usage/credit-history-summary";
import { Card, CardContent } from "@/components/ui/card";
import { Coins, Layers3, WalletCards } from "lucide-react";

interface CreditHistorySummaryCardsProps {
  items: CreditHistorySummaryItem[];
  t: (key: string) => string;
}

function getSummaryMeta(
  key: CreditHistorySummaryItem["key"],
  t: (key: string) => string
) {
  switch (key) {
    case "total":
      return {
        label: t("summary_total"),
        icon: <Coins className="h-4 w-4" />,
      };
    case "subscription":
      return {
        label: t("summary_subscription"),
        icon: <Layers3 className="h-4 w-4" />,
      };
    case "oneTime":
      return {
        label: t("summary_one_time"),
        icon: <WalletCards className="h-4 w-4" />,
      };
  }
}

export function CreditHistorySummaryCards({
  items,
  t,
}: CreditHistorySummaryCardsProps) {
  return (
    <div className="grid gap-4 grid-cols-3">
      {items.map((item) => {
        const meta = getSummaryMeta(item.key, t);

        return (
          <Card key={item.key}>
            <CardContent className="flex items-center justify-between pt-">
              <div>
                <div className="text-sm text-muted-foreground">{meta.label}</div>
                <div className="mt-1 text-2xl font-semibold">{item.value}</div>
              </div>
              <div className="rounded-full border p-2 text-muted-foreground">
                {meta.icon}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
