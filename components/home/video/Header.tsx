import { getUserBenefits } from "@/actions/usage/benefits";
import HeaderShell from "@/components/home/video/HeaderShell";
import { getSession } from "@/lib/auth/server";
import { user as userSchema } from "@/lib/db/schema";

type User = typeof userSchema.$inferSelect;

export default async function VideoHeader() {
  const session = await getSession();
  const user = session?.user;
  const benefits = user ? await getUserBenefits(user.id) : null;

  return (
    <HeaderShell
      user={user as User}
      totalAvailableCredits={benefits?.totalAvailableCredits}
    />
  );
}
