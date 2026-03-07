export interface ReferralRegistrationBinding {
  inviterUserId: string;
  inviteeUserId: string;
  inviteCode: string;
}

export interface ReferralRewardGrant {
  inviterUserId: string;
  inviteeUserId: string;
  rewardType: "signup_credit" | "first_order_cash";
}
