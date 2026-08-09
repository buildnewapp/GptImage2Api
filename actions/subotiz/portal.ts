"use server";

import { getSession } from "@/lib/auth/server";
import { getDb } from "@/lib/db";
import { subscriptions as subscriptionsSchema } from "@/lib/db/schema";
import { getErrorMessage } from "@/lib/error-utils";
import { createSubotizCustomerPortalLink } from "@/lib/subotiz/client";
import { and, desc, eq } from "drizzle-orm";
import { redirect } from "next/navigation";

export async function createSubotizPortalSession(): Promise<void> {
  const session = await getSession();
  const user = session?.user;
  if (!user) {
    redirect("/login");
  }

  const db = getDb();
  let portalUrl: string;

  try {
    const [subscription] = await db
      .select({ customerId: subscriptionsSchema.customerId })
      .from(subscriptionsSchema)
      .where(
        and(
          eq(subscriptionsSchema.userId, user.id),
          eq(subscriptionsSchema.provider, "subotiz"),
        ),
      )
      .orderBy(desc(subscriptionsSchema.createdAt))
      .limit(1);

    if (!subscription?.customerId) {
      throw new Error("Subotiz customer ID was not found.");
    }

    portalUrl = await createSubotizCustomerPortalLink(subscription.customerId);
  } catch (error) {
    const message = encodeURIComponent(getErrorMessage(error));
    redirect(
      `/redirect-error?message=Failed to open Subotiz subscription management: ${message}`,
    );
  }

  redirect(portalUrl);
}
