import type { ClientTokenUser } from "@/lib/auth/client-token";
import { getDb } from "@/lib/db";
import { cacheDb as cacheDbSchema } from "@/lib/db/schema";
import { and, eq, isNull } from "drizzle-orm";

export const CLIENT_AUTH_NAMESPACE = "auth_client";
export const DEFAULT_CLIENT_TICKET_EXPIRES_IN_SECONDS = 10 * 60;

export type ClientTicketRecord = {
  id?: string;
  namespace: string;
  cacheKey: string;
  valueJsonb: {
    client_id: string;
    access_token: string;
    token_type: "Bearer";
    user: ClientTokenUser;
    redirect_uri: string | null;
  };
  expiresAt: Date;
  consumedAt: Date | null;
};

export interface ClientTicketStore {
  upsertTicket(record: ClientTicketRecord): Promise<void>;
  getTicket(namespace: string, cacheKey: string): Promise<ClientTicketRecord | null>;
  markTicketConsumed(
    namespace: string,
    cacheKey: string,
    consumedAt: Date,
  ): Promise<boolean>;
}

export type ClientTicketConsumeResult =
  | {
      code: 0;
      message: "ok";
      data: {
        client_id: string;
        access_token: string;
        token_type: "Bearer";
      };
    }
  | {
      code: 1001;
      message: "pending";
      data: null;
    }
  | {
      code: 1002;
      message: "expired_or_consumed";
      data: null;
    };

function createPendingResult(): ClientTicketConsumeResult {
  return {
    code: 1001,
    message: "pending",
    data: null,
  };
}

function createExpiredOrConsumedResult(): ClientTicketConsumeResult {
  return {
    code: 1002,
    message: "expired_or_consumed",
    data: null,
  };
}

export async function saveClientTicket({
  store,
  clientId,
  redirectUri,
  accessToken,
  user,
  now = new Date(),
  expiresInSeconds = DEFAULT_CLIENT_TICKET_EXPIRES_IN_SECONDS,
}: {
  store: ClientTicketStore;
  clientId: string;
  redirectUri: string | null;
  accessToken: string;
  user: ClientTokenUser;
  now?: Date;
  expiresInSeconds?: number;
}): Promise<void> {
  await store.upsertTicket({
    namespace: CLIENT_AUTH_NAMESPACE,
    cacheKey: clientId,
    valueJsonb: {
      client_id: clientId,
      access_token: accessToken,
      token_type: "Bearer",
      user,
      redirect_uri: redirectUri,
    },
    expiresAt: new Date(now.getTime() + expiresInSeconds * 1000),
    consumedAt: null,
  });
}

export async function consumeClientTicket({
  store,
  clientId,
  now = new Date(),
}: {
  store: ClientTicketStore;
  clientId: string;
  now?: Date;
}): Promise<ClientTicketConsumeResult> {
  const record = await store.getTicket(CLIENT_AUTH_NAMESPACE, clientId);
  if (!record) {
    return createPendingResult();
  }

  if (record.consumedAt || record.expiresAt.getTime() <= now.getTime()) {
    return createExpiredOrConsumedResult();
  }

  const didConsume = await store.markTicketConsumed(
    CLIENT_AUTH_NAMESPACE,
    clientId,
    now,
  );
  if (!didConsume) {
    return createExpiredOrConsumedResult();
  }

  return {
    code: 0,
    message: "ok",
    data: {
      client_id: record.valueJsonb.client_id,
      access_token: record.valueJsonb.access_token,
      token_type: record.valueJsonb.token_type,
    },
  };
}

type DbClient = ReturnType<typeof getDb>;
type DbTransactionCallback = Parameters<DbClient["transaction"]>[0];
type DbTransaction = Parameters<DbTransactionCallback>[0];

export function createDrizzleClientTicketStore(
  tx: DbTransaction,
): ClientTicketStore {
  return {
    async upsertTicket(record) {
      await tx
        .insert(cacheDbSchema)
        .values({
          namespace: record.namespace,
          cacheKey: record.cacheKey,
          valueJsonb: record.valueJsonb,
          expiresAt: record.expiresAt,
          consumedAt: record.consumedAt,
        })
        .onConflictDoUpdate({
          target: [cacheDbSchema.namespace, cacheDbSchema.cacheKey],
          set: {
            valueJsonb: record.valueJsonb,
            expiresAt: record.expiresAt,
            consumedAt: record.consumedAt,
            updatedAt: new Date(),
          },
        });
    },

    async getTicket(namespace, cacheKey) {
      const rows = await tx
        .select({
          id: cacheDbSchema.id,
          namespace: cacheDbSchema.namespace,
          cacheKey: cacheDbSchema.cacheKey,
          valueJsonb: cacheDbSchema.valueJsonb,
          expiresAt: cacheDbSchema.expiresAt,
          consumedAt: cacheDbSchema.consumedAt,
        })
        .from(cacheDbSchema)
        .where(
          and(
            eq(cacheDbSchema.namespace, namespace),
            eq(cacheDbSchema.cacheKey, cacheKey),
          ),
        )
        .limit(1)
        .for("update");

      return (rows[0] as ClientTicketRecord | undefined) ?? null;
    },

    async markTicketConsumed(namespace, cacheKey, consumedAt) {
      const rows = await tx
        .update(cacheDbSchema)
        .set({
          consumedAt,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(cacheDbSchema.namespace, namespace),
            eq(cacheDbSchema.cacheKey, cacheKey),
            isNull(cacheDbSchema.consumedAt),
          ),
        )
        .returning({ id: cacheDbSchema.id });

      return rows.length > 0;
    },
  };
}

export async function saveClientTicketWithDb(
  params: Omit<Parameters<typeof saveClientTicket>[0], "store">,
): Promise<void> {
  await getDb().transaction(async (tx) => {
    await saveClientTicket({
      ...params,
      store: createDrizzleClientTicketStore(tx),
    });
  });
}

export async function consumeClientTicketWithDb({
  clientId,
  now = new Date(),
}: {
  clientId: string;
  now?: Date;
}): Promise<ClientTicketConsumeResult> {
  return getDb().transaction(async (tx) =>
    consumeClientTicket({
      store: createDrizzleClientTicketStore(tx),
      clientId,
      now,
    }),
  );
}
