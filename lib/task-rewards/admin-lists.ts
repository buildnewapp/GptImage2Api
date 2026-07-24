import {
  MANUAL_REVIEW_TASK_KEYS,
  type ManualReviewTaskKey,
} from "@/config/task-rewards";
import type { RewardApplicationStatus } from "@/lib/task-rewards/application-store";

const MIN_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;
const allowedStatuses = new Set<RewardApplicationStatus>([
  "pending",
  "approved",
  "rejected",
]);
const allowedTaskKeys = new Set<ManualReviewTaskKey>(MANUAL_REVIEW_TASK_KEYS);

export const DEFAULT_TASK_REWARD_ADMIN_PAGE_SIZE = MIN_PAGE_SIZE;
export const MANUAL_TASK_REWARD_ADMIN_PAGE_SIZE_OPTIONS = [20, 50, 100];
export const TASK_REWARD_ADMIN_APPLICATION_STATUSES = [
  "pending",
  "approved",
  "rejected",
] as const;

export interface TaskRewardAdminListQueryInput {
  pageIndex?: number;
  pageSize?: number;
  status?: string;
  taskKey?: string;
  query?: string;
}

export interface TaskRewardAdminListQuery {
  pageIndex: number;
  pageSize: number;
  status: RewardApplicationStatus;
  taskKey: ManualReviewTaskKey | "";
  query: string;
}

function normalizePageSize(pageSize?: number): number {
  if (!Number.isFinite(pageSize)) return DEFAULT_TASK_REWARD_ADMIN_PAGE_SIZE;
  return Math.min(
    MAX_PAGE_SIZE,
    Math.max(MIN_PAGE_SIZE, Math.trunc(pageSize!)),
  );
}

export function normalizeTaskRewardAdminListQuery(
  input: TaskRewardAdminListQueryInput,
): TaskRewardAdminListQuery {
  const normalizedStatus = input.status?.trim();
  const normalizedTaskKey = input.taskKey?.trim();

  return {
    pageIndex: Math.max(0, Math.trunc(input.pageIndex ?? 0)),
    pageSize: normalizePageSize(input.pageSize),
    status:
      normalizedStatus &&
      allowedStatuses.has(normalizedStatus as RewardApplicationStatus)
        ? (normalizedStatus as RewardApplicationStatus)
        : "pending",
    taskKey:
      normalizedTaskKey &&
      allowedTaskKeys.has(normalizedTaskKey as ManualReviewTaskKey)
        ? (normalizedTaskKey as ManualReviewTaskKey)
        : "",
    query: input.query?.trim() ?? "",
  };
}

export function toTaskRewardAdminListOffset(
  pageIndex: number,
  pageSize: number,
): number {
  return Math.max(0, Math.trunc(pageIndex)) * normalizePageSize(pageSize);
}
