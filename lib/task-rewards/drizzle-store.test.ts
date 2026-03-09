import assert from "node:assert/strict";
import test from "node:test";

import { aiStudioGenerations } from "@/lib/db/schema";
import { hasSuccessfulPublicVideoForUser } from "@/lib/task-rewards/drizzle-store";

function createSelectChainSpy(rows: Array<{ id: string }>) {
  const state: { lastFromTable: unknown } = { lastFromTable: null };

  const db = {
    select() {
      return {
        from(table: unknown) {
          state.lastFromTable = table;
          return {
            where() {
              return {
                limit: async () => rows,
              };
            },
          };
        },
      };
    },
  };

  return {
    db,
    get lastFromTable() {
      return state.lastFromTable;
    },
  };
}

test("hasSuccessfulPublicVideoForUser queries AI Studio generations", async () => {
  const spy = createSelectChainSpy([{ id: "row-1" }]);

  const result = await hasSuccessfulPublicVideoForUser(spy.db as any, "user-1");

  assert.equal(result, true);
  assert.equal(spy.lastFromTable, aiStudioGenerations);
});

test("hasSuccessfulPublicVideoForUser returns false when no AI Studio generation exists", async () => {
  const spy = createSelectChainSpy([]);

  const result = await hasSuccessfulPublicVideoForUser(spy.db as any, "user-1");

  assert.equal(result, false);
  assert.equal(spy.lastFromTable, aiStudioGenerations);
});
