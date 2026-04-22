import { getUserBenefits } from "@/actions/usage/benefits";
import { getSession } from "@/lib/auth/server";
import { AuthGuard } from "@/components/auth/AuthGuard";
import SidebarInsetHeader from "@/components/header/SidebarInsetHeader";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import React from "react";
import { DashboardSidebar } from "./DashboardSidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const showMemberSubscription = process.env.SHOW_MEMBER_SUBSCRIPTION === "true";
  const session = await getSession();
  const user = session?.user;
  const benefits = user ? await getUserBenefits(user.id) : null;

  return (
    <AuthGuard>
      <SidebarProvider>
        <DashboardSidebar
          showMemberSubscription={showMemberSubscription}
          totalAvailableCredits={benefits?.totalAvailableCredits}
        />
        <SidebarInset className="min-w-0">
          <SidebarInsetHeader />
          <div className="flex flex-1 flex-col gap-4 p-4 pt-0 min-w-0">
            <div className="min-h-screen flex-1 rounded-xl md:min-h-min min-w-0">
              {children}
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </AuthGuard>
  );
}
