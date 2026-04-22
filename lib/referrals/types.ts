import type { referralInvites, referralRewards, referralWithdrawRequests } from "@/lib/db/schema";

export type ReferralInvite = typeof referralInvites.$inferSelect;
export type ReferralReward = typeof referralRewards.$inferSelect;
export type ReferralWithdrawRequest = typeof referralWithdrawRequests.$inferSelect;

export type ReferralRewardMode = "fixed" | "percentage";
