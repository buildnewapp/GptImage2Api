/**
 * Shared types for payment verification
 */

import { PaymentProvider } from "@/lib/db/schema";

export type Provider = PaymentProvider

export type SubscriptionData = {
  id: string;
  subscriptionId: string;
  planId: string | null;
  status: string;
  metadata: unknown;
};

export type OrderData = {
  id: string;
  planId: string | null;
  metadata: unknown;
  status: string;
};
