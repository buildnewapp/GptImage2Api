export type AiStudioAdminRow = {
  id: string;
  userEmail: string | null;
  userName: string | null;
  category: string;
  title: string;
  provider: string;
  status: string;
  reservedCredits: number;
  refundedCredits: number;
  createdAt: string;
};

export function canAdminMarkGenerationFailed(status: string) {
  return status !== "failed";
}

export function formatAdminFailureReason(
  reason?: string | null,
  existingReason?: string | null,
) {
  const normalized = reason?.trim();
  if (normalized) {
    return `Marked failed by admin: ${normalized}`;
  }

  if (existingReason?.trim()) {
    return `Marked failed by admin: ${existingReason.trim()}`;
  }

  return "Marked failed by admin.";
}

export function matchesAiStudioAdminFilters(
  row: AiStudioAdminRow,
  filters: {
    status?: string;
    category?: string;
    search?: string;
  },
) {
  if (filters.status && filters.status !== "all" && row.status !== filters.status) {
    return false;
  }

  if (filters.category && filters.category !== "all" && row.category !== filters.category) {
    return false;
  }

  if (filters.search?.trim()) {
    const query = filters.search.trim().toLowerCase();
    const haystack = [
      row.userEmail,
      row.userName,
      row.title,
      row.provider,
      row.id,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    if (!haystack.includes(query)) {
      return false;
    }
  }

  return true;
}

export function buildAiStudioAdminSummary(rows: AiStudioAdminRow[]) {
  return rows.reduce(
    (summary, row) => {
      summary.total += 1;
      summary.reservedCredits += row.reservedCredits;
      summary.refundedCredits += row.refundedCredits;

      if (row.status === "succeeded") {
        summary.succeeded += 1;
      } else if (row.status === "failed") {
        summary.failed += 1;
      } else {
        summary.active += 1;
      }

      return summary;
    },
    {
      total: 0,
      active: 0,
      succeeded: 0,
      failed: 0,
      reservedCredits: 0,
      refundedCredits: 0,
    },
  );
}
