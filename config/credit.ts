export const creditConfig = {
  // Set to a positive number to grant one-time credits to newly registered users.
  signupBonusCredits: 10,
  signupBonusPolicy: {
    blockedEmailKeywords: ["valwagten"],
    maxPerIp24Hours: 2,
    maxPerIp7Days: 3,
    maxPerDevice30Days: 1,
  },
} as const;
