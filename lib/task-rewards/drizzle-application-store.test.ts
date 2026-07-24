import assert from "node:assert/strict";
import test from "node:test";
import { drizzle } from "drizzle-orm/postgres-js";

import * as schema from "@/lib/db/schema";
import { rewardApplications } from "@/lib/db/schema";
import * as applicationStoreModule from "@/lib/task-rewards/drizzle-application-store";
import { PgDialect, getTableConfig } from "drizzle-orm/pg-core";

const {
  createDrizzleRewardApplicationStore,
  getLatestManualApplicationsForUser,
} = applicationStoreModule;

const validEvidenceKey =
  "task/2026/07/20/upload/user-1/github_star/123e4567-e89b-42d3-a456-426614174000.png";
const sealedEvidenceKey =
  "task/2026/07/20/sealed/user-1/github_star/223e4567-e89b-42d3-a456-426614174000.png";

const applicationRow = {
  id: "application-1",
  userId: "user-1",
  taskKey: "github_star",
  source: "user" as const,
  status: "pending" as const,
  creditAmount: 10,
  evidenceUrls: [validEvidenceKey],
  submissionText: "I starred the repository.",
  reviewNote: null,
  reviewedByUserId: null,
  submittedAt: new Date("2026-07-20T08:00:00.000Z"),
  reviewedAt: null,
  createdAt: new Date("2026-07-20T08:00:00.000Z"),
  updatedAt: new Date("2026-07-20T08:00:00.000Z"),
};

function renderQuery(query: unknown) {
  return new PgDialect().sqlToQuery(query as any);
}

test("uses one active-state unique index for pending and approved applications", () => {
  const indexes = getTableConfig(rewardApplications).indexes;
  const activeIndex = indexes.find(
    (index) =>
      index.config.name === "reward_applications_user_task_active_unique",
  );

  assert.ok(activeIndex);
  assert.equal(activeIndex.config.unique, true);
  assert.match(
    renderQuery(activeIndex.config.where).sql,
    /status.*in \('pending', 'approved'\)/,
  );
  assert.equal(
    indexes.some((index) =>
      [
        "reward_applications_user_task_pending_unique",
        "reward_applications_user_task_approved_unique",
      ].includes(index.config.name ?? ""),
    ),
    false,
  );
});

test("indexes the latest manual application lookup prefix", () => {
  const indexes = getTableConfig(rewardApplications).indexes;
  const lookupIndex = indexes.find(
    (index) =>
      index.config.name ===
      "idx_reward_applications_user_source_task_submitted_at",
  );

  assert.ok(lookupIndex);
  assert.deepEqual(
    lookupIndex.config.columns.map((column) =>
      "name" in column ? column.name : undefined,
    ),
    ["user_id", "source", "task_key", "submitted_at"],
  );
});

test("compiles one deterministic DISTINCT ON row per manual task", () => {
  const buildQuery = (
    applicationStoreModule as unknown as {
      buildLatestManualApplicationsForUserQuery?: (
        db: any,
        userId: string,
        taskKeys: string[],
      ) => { toSQL(): { sql: string; params: unknown[] } };
    }
  ).buildLatestManualApplicationsForUserQuery;

  assert.equal(typeof buildQuery, "function");
  if (!buildQuery) return;

  const compiled = buildQuery(drizzle.mock({ schema }), "user-1", [
    "github_star",
    "share_facebook",
  ]).toSQL();

  assert.match(
    compiled.sql,
    /select distinct on \("reward_applications"\."task_key"\)/,
  );
  assert.match(
    compiled.sql,
    /order by "reward_applications"\."task_key", "reward_applications"\."submitted_at" desc, "reward_applications"\."created_at" desc, "reward_applications"\."id" desc/,
  );
  assert.deepEqual(compiled.params, [
    "user-1",
    "user",
    "github_star",
    "share_facebook",
  ]);
});

test("prepares evidence without opening a database transaction", async () => {
  const sealedKeys: string[] = [];
  const finalKey = validEvidenceKey.replace("/upload/", "/sealed/");
  const store = createDrizzleRewardApplicationStore({
    db: {
      async transaction() {
        throw new Error("evidence preparation must not open a transaction");
      },
    } as any,
    prepareEvidenceObject: async (input) => {
      sealedKeys.push(input.uploadKey);
      return input.userId === "user-1" && input.taskKey === "github_star"
        ? finalKey
        : null;
    },
  });

  assert.equal(
    await store.prepareEvidence("user-1", "github_star", validEvidenceKey),
    finalKey,
  );
  assert.notEqual(finalKey, validEvidenceKey);
  assert.deepEqual(sealedKeys, [validEvidenceKey]);
});

test("deletes evidence without opening a database transaction", async () => {
  const deletedKeys: string[] = [];
  const store = createDrizzleRewardApplicationStore({
    db: {
      async transaction() {
        throw new Error("evidence cleanup must not open a transaction");
      },
    } as any,
    deleteEvidenceObject: async (key) => {
      deletedKeys.push(key);
    },
  });

  await store.deleteEvidence(validEvidenceKey);
  assert.deepEqual(deletedKeys, [validEvidenceKey]);
});

test("submission and review acquire the same user-task advisory lock before row locking", async () => {
  const submissionEvents: string[] = [];
  const reviewEvents: string[] = [];
  let submissionLockQuery: unknown;
  let reviewLockQuery: unknown;

  const submissionTx = {
    async execute(query: unknown) {
      submissionEvents.push("advisory_lock");
      submissionLockQuery = query;
    },
  };
  const submissionDb = {
    async transaction<T>(
      operation: (transaction: typeof submissionTx) => Promise<T>,
    ) {
      submissionEvents.push("transaction");
      return operation(submissionTx);
    },
  };
  const submissionStore = createDrizzleRewardApplicationStore({
    db: submissionDb as any,
    prepareEvidenceObject: async () => sealedEvidenceKey,
  });

  await submissionStore.withTaskLock("user-1", "github_star", async () => {
    submissionEvents.push("operation");
  });

  const reviewTx = {
    async execute(query: unknown) {
      reviewEvents.push("advisory_lock");
      reviewLockQuery = query;
    },
    select() {
      return {
        from() {
          return {
            where() {
              return {
                limit() {
                  return {
                    for: async (strength: string) => {
                      reviewEvents.push(`row_lock:${strength}`);
                      return [applicationRow];
                    },
                  };
                },
              };
            },
          };
        },
      };
    },
  };
  const reviewDb = {
    select() {
      reviewEvents.push("identity_read");
      return {
        from() {
          return {
            where() {
              return {
                limit: async () => [
                  {
                    userId: applicationRow.userId,
                    taskKey: applicationRow.taskKey,
                  },
                ],
              };
            },
          };
        },
      };
    },
    async transaction<T>(
      operation: (transaction: typeof reviewTx) => Promise<T>,
    ) {
      reviewEvents.push("transaction");
      return operation(reviewTx);
    },
  };
  const reviewStore = createDrizzleRewardApplicationStore({
    db: reviewDb as any,
    prepareEvidenceObject: async () => sealedEvidenceKey,
  });

  await reviewStore.withLockedApplication(
    "application-1",
    async ({ application }) => application?.id,
  );

  assert.deepEqual(submissionEvents, [
    "transaction",
    "advisory_lock",
    "operation",
  ]);
  assert.deepEqual(reviewEvents, [
    "identity_read",
    "transaction",
    "advisory_lock",
    "row_lock:update",
  ]);
  assert.deepEqual(renderQuery(submissionLockQuery), {
    sql: "select pg_advisory_xact_lock($1, hashtext($2))",
    params: [20260720, "user-1:github_star"],
    typings: ["none", "none"],
  });
  assert.deepEqual(
    renderQuery(reviewLockQuery),
    renderQuery(submissionLockQuery),
  );
});

test("creates a pending application with exactly one evidence key", async () => {
  const state: { table?: unknown; values?: Record<string, unknown> } = {};
  const tx = {
    async execute() {},
    insert(table: unknown) {
      state.table = table;
      return {
        values(values: Record<string, unknown>) {
          state.values = values;
          return {
            onConflictDoNothing() {
              return {
                returning: async () => [applicationRow],
              };
            },
          };
        },
      };
    },
  };
  const db = {
    async transaction<T>(operation: (transaction: typeof tx) => Promise<T>) {
      return operation(tx);
    },
  };
  const store = createDrizzleRewardApplicationStore({
    db: db as any,
    prepareEvidenceObject: async () => sealedEvidenceKey,
  });

  const result = await store.withTaskLock(
    "user-1",
    "github_star",
    (lockedStore) =>
      lockedStore.createPendingApplication({
        userId: "user-1",
        taskKey: "github_star",
        creditAmount: 10,
        evidenceKey: sealedEvidenceKey,
        submissionText: "I starred the repository.",
        now: new Date("2026-07-20T08:00:00.000Z"),
      }),
  );

  assert.equal(result.status, "created");
  assert.equal(state.table, rewardApplications);
  assert.deepEqual(state.values?.evidenceUrls, [sealedEvidenceKey]);
  assert.equal(state.values?.source, "user");
  assert.equal(state.values?.status, "pending");
});

test("rechecks claims and active applications to classify insert conflicts", async () => {
  async function runConflict(selectResults: Array<Array<{ id: string }>>) {
    const queuedResults = [...selectResults];
    const tx = {
      async execute() {},
      insert() {
        return {
          values() {
            return {
              onConflictDoNothing() {
                return { returning: async () => [] };
              },
            };
          },
        };
      },
      select() {
        return {
          from() {
            return {
              where() {
                return {
                  limit: async () => queuedResults.shift() ?? [],
                };
              },
            };
          },
        };
      },
    };
    const db = {
      async transaction<T>(operation: (transaction: typeof tx) => Promise<T>) {
        return operation(tx);
      },
    };
    const store = createDrizzleRewardApplicationStore({
      db: db as any,
      prepareEvidenceObject: async () => sealedEvidenceKey,
    });

    return store.withTaskLock("user-1", "github_star", (lockedStore) =>
      lockedStore.createPendingApplication({
        userId: "user-1",
        taskKey: "github_star",
        creditAmount: 10,
        evidenceKey: sealedEvidenceKey,
        submissionText: "I starred the repository.",
        now: new Date("2026-07-20T08:00:00.000Z"),
      }),
    );
  }

  assert.deepEqual(await runConflict([[{ id: "claim-1" }]]), {
    status: "conflict",
    reason: "already_claimed",
  });
  assert.deepEqual(await runConflict([[], [{ id: "approved-1" }]]), {
    status: "conflict",
    reason: "already_claimed",
  });
  assert.deepEqual(await runConflict([[], [], [{ id: "pending-1" }]]), {
    status: "conflict",
    reason: "pending_application_exists",
  });
});

test("loads the latest user application for each enabled manual task", async () => {
  const olderGithub = {
    ...applicationRow,
    id: "github-older",
    status: "rejected" as const,
    submittedAt: new Date("2026-07-18T08:00:00.000Z"),
  };
  const latestGithub = {
    ...applicationRow,
    id: "github-latest",
    submittedAt: new Date("2026-07-20T08:00:00.000Z"),
  };
  const facebook = {
    ...applicationRow,
    id: "facebook-latest",
    taskKey: "share_facebook",
    status: "rejected" as const,
    submittedAt: new Date("2026-07-19T08:00:00.000Z"),
  };
  const queriedTables: unknown[] = [];
  let selectionKind = "select";
  const queryChain = (table: unknown) => {
    queriedTables.push(table);
    return {
      where() {
        return {
          orderBy: async () => [latestGithub, facebook],
        };
      },
    };
  };
  const db = {
    select() {
      return {
        from(table: unknown) {
          return queryChain(table);
        },
      };
    },
    selectDistinctOn() {
      selectionKind = "distinct_on";
      return {
        from(table: unknown) {
          return queryChain(table);
        },
      };
    },
  };

  const result = await getLatestManualApplicationsForUser(db as any, "user-1", [
    "github_star",
    "share_facebook",
  ]);

  assert.deepEqual(queriedTables, [rewardApplications]);
  assert.equal(selectionKind, "distinct_on");
  assert.equal(result.get("github_star")?.id, "github-latest");
  assert.equal(result.get("share_facebook")?.id, "facebook-latest");
});

test("skips the database when no manual tasks are enabled", async () => {
  let queried = false;
  const result = await getLatestManualApplicationsForUser(
    {
      select() {
        queried = true;
        throw new Error("must not query");
      },
    } as any,
    "user-1",
    [],
  );

  assert.equal(queried, false);
  assert.equal(result.size, 0);
});
