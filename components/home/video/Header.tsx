import { getUserBenefits } from "@/actions/usage/benefits";
import HeaderShell from "@/components/home/video/HeaderShell";
import type { VideoTemplateNavigation } from "@/components/home/video/types";
import { getSession } from "@/lib/auth/server";
import { user as userSchema } from "@/lib/db/schema";
import { getTranslations } from "next-intl/server";

type User = typeof userSchema.$inferSelect;

export default async function VideoHeader() {
  const t = await getTranslations("ImageTemplate");
  const navigation = t.raw("navigation") as VideoTemplateNavigation;
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
