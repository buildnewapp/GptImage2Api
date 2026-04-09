import { getUserBenefits } from "@/actions/usage/benefits";
import HeaderShell from "@/components/home/template2/HeaderShell";
import type { HomeTemplate2Navigation } from "@/components/home/template2/types";
import { getSession } from "@/lib/auth/server";
import { user as userSchema } from "@/lib/db/schema";
import { getTranslations } from "next-intl/server";

type User = typeof userSchema.$inferSelect;

export default async function Template2Header() {
  const t = await getTranslations("HomeTemplate2");
  const navigation = t.raw("navigation") as HomeTemplate2Navigation;
  const session = await getSession();
  const user = session?.user;
  const benefits = user ? await getUserBenefits(user.id) : null;

  return (
    <HeaderShell
      navigation={navigation}
      user={user as User}
      totalAvailableCredits={benefits?.totalAvailableCredits}
    />
  );
}
