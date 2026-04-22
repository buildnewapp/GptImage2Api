export function getAdminUserTotalCredits(input: {
  subscriptionCreditsBalance?: number | null;
  oneTimeCreditsBalance?: number | null;
}) {
  return (input.subscriptionCreditsBalance ?? 0) + (input.oneTimeCreditsBalance ?? 0);
}

export function buildAdminUserQuickActionLinks({
  locale,
  userId,
}: {
  locale: string;
  userId: string;
}) {
  return {
    orders: `/${locale}/dashboard/orders?userId=${encodeURIComponent(userId)}`,
    credits: `/${locale}/dashboard/credits?userId=${encodeURIComponent(userId)}`,
    generations: `/${locale}/dashboard/ai-studio-admin?userId=${encodeURIComponent(userId)}`,
  };
}

export function buildAdminUserScopeLabel(input: {
  id: string;
  name?: string | null;
  email?: string | null;
}) {
  if (input.name && input.email) {
    return `${input.name} · ${input.email}`;
  }

  return input.name || input.email || input.id;
}
