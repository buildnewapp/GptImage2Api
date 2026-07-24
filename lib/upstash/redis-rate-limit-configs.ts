import { LOWER_CASE_SITE_NAME } from "@/lib/upstash/redis-keys";

export const REDIS_RATE_LIMIT_CONFIGS = {
  anonymousUpload: {
    prefix: `${LOWER_CASE_SITE_NAME}:rl:anonymous-upload`,
    maxRequests: 100,
    window: "1 d",
  },
  anonymousDownload: {
    prefix: `${LOWER_CASE_SITE_NAME}:rl:anonymous-download`,
    maxRequests: 100,
    window: "1 d",
  },
  newsletter: {
    prefix: `${LOWER_CASE_SITE_NAME}:rl:newsletter`,
    maxRequests: 10,
    window: "1 d",
  },
  taskEvidenceUpload: {
    prefix: `${LOWER_CASE_SITE_NAME}:rl:task-evidence-upload`,
    maxRequests: 20,
    window: "1 d",
  },
};
