import { DynamicIcon } from "@/components/DynamicIcon";
import { Card } from "@/components/ui/card";
import { Link } from "@/i18n/routing";
import { OVERVIEW_ADMIN_MENU_HREFS } from "@/lib/admin/navigation";
import { ArrowRight } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { DatabaseConfigPreview } from "./DatabaseConfigPreview";
import { GenerationBreakdownCharts } from "./GenerationBreakdownCharts";
import { GenerationStatsChart } from "./GenerationStatsChart";
import { GrowthChart } from "./GrowthChart";
import { OverviewStats } from "./OverviewStats";
import { UserCreditReport } from "./UserCreditReport";

type AdminMenu = {
  name: string;
  href: string;
  icon: string;
};

const OverviewPage = async () => {
  const t = await getTranslations("Overview");
  const loginT = await getTranslations("Login");
  const adminMenus: AdminMenu[] = loginT.raw("AdminMenus");
  const quickLinks = OVERVIEW_ADMIN_MENU_HREFS.map((href) =>
    adminMenus.find((menu) => menu.href === href),
  ).filter((menu): menu is AdminMenu => Boolean(menu));

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-4">
      <section aria-labelledby="admin-quick-links-title" className="space-y-2">
        <div>
          <h2 id="admin-quick-links-title" className="font-semibold">
            {t("adminQuickLinks")}
          </h2>
          <p className="text-xs text-muted-foreground">
            {t("adminQuickLinksDescription")}
          </p>
        </div>

        <div className="flex flex-row flex-nowrap gap-2 overflow-x-auto pb-1">
          {quickLinks.map((menu) => (
            <Card
              key={menu.href}
              className="min-w-40 flex-1 basis-0 overflow-hidden py-0 transition-colors hover:bg-muted/50"
            >
              <Link
                href={menu.href}
                className="group flex min-h-16 cursor-pointer items-center gap-2 rounded-xl p-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <DynamicIcon name={menu.icon} className="size-4" />
                </span>
                <span className="min-w-0 flex-1 text-sm font-medium">
                  {menu.name}
                </span>
                <ArrowRight
                  aria-hidden="true"
                  className="size-4 shrink-0 text-muted-foreground transition-colors group-hover:text-foreground"
                />
              </Link>
            </Card>
          ))}
        </div>
      </section>

      <OverviewStats />

      <GrowthChart />

      <GenerationStatsChart />

      <GenerationBreakdownCharts />

      <UserCreditReport />

      <DatabaseConfigPreview />
    </div>
  );
};

export default OverviewPage;
