import assert from "node:assert/strict";
import test from "node:test";

import {
  consumeClientTicket,
  saveClientTicket,
  type ClientTicketRecord,
  type ClientTicketStore,
} from "@/lib/auth/client-ticket-store";

class MemoryClientTicketStore implements ClientTicketStore {
  private records = new Map<string, ClientTicketRecord>();

  async upsertTicket(record: ClientTicketRecord): Promise<void> {
    this.records.set(`${record.namespace}:${record.cacheKey}`, record);
  }

  async getTicket(
    namespace: string,
    cacheKey: string,
  ): Promise<ClientTicketRecord | null> {
    return this.records.get(`${namespace}:${cacheKey}`) ?? null;
  }

  async markTicketConsumed(
    namespace: string,
    cacheKey: string,
    consumedAt: Date,
  ): Promise<boolean> {
    const key = `${namespace}:${cacheKey}`;
    const existing = this.records.get(key);
    if (!existing || existing.consumedAt) {
      return false;
    }

    this.records.set(key, {
      ...existing,
      consumedAt,
    });
    return true;
  }
}

function createUser(createdAt = "2026-03-07T00:00:00.000Z") {
  return {
    uuid: "user-1",
    email: "user@example.com",
    nickname: "User One",
    avatar_url: "https://example.com/avatar.png",
    created_at: createdAt,
  };
}

test("returns pending when a client ticket has not been created yet", async () => {
  const store = new MemoryClientTicketStore();

  const result = await consumeClientTicket({
    store,
    clientId: "missing-client",
    now: new Date("2026-03-07T00:00:00.000Z"),
  });

  assert.deepEqual(result, {
    code: 1001,
    message: "pending",
    data: null,
  });
});

test("consumes a client ticket only once", async () => {
  const store = new MemoryClientTicketStore();

  await saveClientTicket({
    store,
    clientId: "client-123",
    redirectUri: "figma-plugin",
    accessToken: "token-1",
    user: createUser(),
    now: new Date("2026-03-07T00:00:00.000Z"),
  });

  const first = await consumeClientTicket({
    store,
    clientId: "client-123",
    now: new Date("2026-03-07T00:01:00.000Z"),
  });
  const second = await consumeClientTicket({
    store,
    clientId: "client-123",
    now: new Date("2026-03-07T00:01:01.000Z"),
  });

  assert.deepEqual(first, {
    code: 0,
    message: "ok",
    data: {
      client_id: "client-123",
      access_token: "token-1",
      token_type: "Bearer",
    },
  });
  assert.deepEqual(second, {
    code: 1002,
    message: "expired_or_consumed",
    data: null,
  });
});

test("returns expired_or_consumed when the ticket has expired", async () => {
  const store = new MemoryClientTicketStore();

  await saveClientTicket({
    store,
    clientId: "client-expired",
    redirectUri: null,
    accessToken: "token-expired",
    user: createUser(),
    now: new Date("2026-03-07T00:00:00.000Z"),
    expiresInSeconds: 60,
  });

  const result = await consumeClientTicket({
    store,
    clientId: "client-expired",
    now: new Date("2026-03-07T00:01:01.000Z"),
  });

  assert.deepEqual(result, {
    code: 1002,
    message: "expired_or_consumed",
    data: null,
  });
});

test("overwrites the previous live ticket for the same client id", async () => {
  const store = new MemoryClientTicketStore();

  await saveClientTicket({
    store,
    clientId: "client-overwrite",
    redirectUri: "figma-plugin",
    accessToken: "token-old",
    user: createUser("2026-03-06T00:00:00.000Z"),
    now: new Date("2026-03-07T00:00:00.000Z"),
  });
  await saveClientTicket({
    store,
    clientId: "client-overwrite",
    redirectUri: "chrome-extension://example",
    accessToken: "token-new",
    user: createUser(),
    now: new Date("2026-03-07T00:02:00.000Z"),
  });

  const result = await consumeClientTicket({
    store,
    clientId: "client-overwrite",
    now: new Date("2026-03-07T00:03:00.000Z"),
  });

  assert.deepEqual(result, {
    code: 0,
    message: "ok",
    data: {
      client_id: "client-overwrite",
      access_token: "token-new",
      token_type: "Bearer",
    },
  });
});
