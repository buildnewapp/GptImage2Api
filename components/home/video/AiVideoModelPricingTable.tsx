"use client";

import type {
  AiVideoModelPricingGroup,
  AiVideoModelPricingRow,
} from "@/components/home/video/ai-video-model-pricing-data";
import { ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";

interface AiVideoModelPricingTableCopy {
  billingNote: string;
  creditPrice: string;
  fixedUnit: string;
  hot: string;
  model: string;
  modelCount: string;
  perImageUnit: string;
  perSecondUnit: string;
  searchPlaceholder: string;
  special: string;
  spec: string;
  type: string;
}

interface AiVideoModelPricingTableProps {
  copy: AiVideoModelPricingTableCopy;
  groups: AiVideoModelPricingGroup[];
}

interface AiVideoModelPricingVersionRow {
  billingNote: string;
  creditPrice: string;
  model: string;
  spec: string;
  type: string;
  versionKey: string;
}

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function formatRate(value: number) {
  if (Number.isInteger(value)) {
    return String(value);
  }

  return value.toFixed(1).replace(/\.0$/, "");
}

function getUnitLabel(
  unit: AiVideoModelPricingRow["priceUnit"],
  copy: AiVideoModelPricingTableCopy,
) {
  if (unit === "per_second") {
    return copy.perSecondUnit;
  }
  if (unit === "per_image") {
    return copy.perImageUnit;
  }
  return copy.fixedUnit;
}

function buildPriceSummary(
  rows: AiVideoModelPricingRow[],
  copy: AiVideoModelPricingTableCopy,
) {
  const unitOrder: AiVideoModelPricingRow["priceUnit"][] = [
    "per_second",
    "fixed",
    "per_image",
  ];

  return unitOrder
    .map((unit) => {
      const rates = rows
        .filter((row) => row.priceUnit === unit)
        .map((row) => row.priceRate);

      if (rates.length === 0) {
        return null;
      }

      const min = Math.min(...rates);
      const max = Math.max(...rates);
      const rateLabel =
        min === max ? formatRate(min) : `${formatRate(min)}-${formatRate(max)}`;

      return `${rateLabel} ${getUnitLabel(unit, copy)}`;
    })
    .filter(Boolean)
    .join(" / ");
}

function getModelCount(rows: AiVideoModelPricingRow[]) {
  return new Set(rows.map((row) => row.versionKey)).size;
}

function joinUnique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean))).join(" / ");
}

function buildVersionRows(
  rows: AiVideoModelPricingRow[],
  copy: AiVideoModelPricingTableCopy,
): AiVideoModelPricingVersionRow[] {
  const versions: AiVideoModelPricingVersionRow[] = [];
  const versionMap = new Map<string, AiVideoModelPricingRow[]>();

  for (const row of rows) {
    const versionRows = versionMap.get(row.versionKey);
    if (versionRows) {
      versionRows.push(row);
    } else {
      versionMap.set(row.versionKey, [row]);
    }
  }

  for (const [versionKey, versionRows] of versionMap.entries()) {
    const firstRow = versionRows[0];
    if (!firstRow) {
      continue;
    }

    versions.push({
      billingNote: joinUnique(versionRows.map((row) => row.billingNote)),
      creditPrice: buildPriceSummary(versionRows, copy),
      model: firstRow.model,
      spec: joinUnique(versionRows.map((row) => row.spec)),
      type: joinUnique(versionRows.map((row) => row.type)),
      versionKey,
    });
  }

  return versions;
}

export default function AiVideoModelPricingTable({
  copy,
  groups,
}: AiVideoModelPricingTableProps) {
  const [expandedFamilies, setExpandedFamilies] = useState<Set<string>>(
    () => new Set(),
  );
  const [query, setQuery] = useState("");
  const [showSpecial, setShowSpecial] = useState(false);
  const [showHot, setShowHot] = useState(false);

  const normalizedQuery = normalize(query);
  const hasActiveFilters = showSpecial || showHot;
  const hasActiveControls = normalizedQuery.length > 0 || hasActiveFilters;

  const visibleGroups = useMemo(
    () =>
      groups
        .map((group) => {
          const familyMatches =
            normalizedQuery.length > 0 &&
            normalize(group.familyLabel).includes(normalizedQuery);
          const rows = group.rows.filter((row) => {
            const rowMatchesQuery =
              normalizedQuery.length === 0 ||
              familyMatches ||
              normalize(row.model).includes(normalizedQuery);
            const rowMatchesFilter =
              !hasActiveFilters ||
              (showSpecial && row.isSpecial) ||
              (showHot && row.isHot);

            return rowMatchesQuery && rowMatchesFilter;
          });

          return {
            ...group,
            modelCount: getModelCount(rows),
            priceSummary: buildPriceSummary(rows, copy),
            rows,
            versions: buildVersionRows(rows, copy),
          };
        })
        .filter((group) => group.rows.length > 0),
    [copy, groups, hasActiveFilters, normalizedQuery, showHot, showSpecial],
  );

  function toggleFamily(familyKey: string) {
    setExpandedFamilies((current) => {
      const next = new Set(current);
      if (next.has(familyKey)) {
        next.delete(familyKey);
      } else {
        next.add(familyKey);
      }
      return next;
    });
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-3 border-b px-6 py-4">
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={copy.searchPlaceholder}
          className="h-10 w-full max-w-sm rounded-md border border-border bg-background px-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary"
        />
        <label className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-md border border-border px-3 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
          <input
            type="checkbox"
            checked={showSpecial}
            onChange={(event) => setShowSpecial(event.target.checked)}
            className="h-4 w-4 accent-primary"
          />
          {copy.special}
        </label>
        <label className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-md border border-border px-3 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
          <input
            type="checkbox"
            checked={showHot}
            onChange={(event) => setShowHot(event.target.checked)}
            className="h-4 w-4 accent-primary"
          />
          {copy.hot}
        </label>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b">
              <th className="p-6 text-left font-semibold">{copy.model}</th>
              <th className="p-6 text-center font-semibold">{copy.type}</th>
              <th className="p-6 text-center font-semibold">{copy.spec}</th>
              <th className="p-6 text-center font-semibold text-primary">
                {copy.creditPrice}
              </th>
              <th className="p-6 text-center font-semibold text-muted-foreground">
                {copy.billingNote}
              </th>
            </tr>
          </thead>
          {visibleGroups.map((group) => {
            const expanded =
              hasActiveControls || expandedFamilies.has(group.familyKey);

            return (
              <tbody key={group.familyKey}>
                <tr className="border-b bg-muted/30">
                  <td colSpan={5} className="p-0">
                    <button
                      type="button"
                      aria-expanded={expanded}
                      onClick={() => toggleFamily(group.familyKey)}
                      className="flex w-full min-w-[760px] cursor-pointer items-center gap-6 px-6 py-4 text-sm font-semibold text-foreground transition-colors hover:bg-muted/50"
                    >
                      <span className="flex min-w-0 flex-1 items-center gap-3 text-left">
                        <ChevronRight
                          className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${
                            expanded ? "rotate-90" : ""
                          }`}
                        />
                        <span className="truncate">{group.familyLabel}</span>
                        <span className="shrink-0 whitespace-nowrap text-xs font-medium text-muted-foreground">
                          {group.modelCount} {copy.modelCount}
                        </span>
                      </span>
                      <span className="shrink-0 whitespace-nowrap text-right font-semibold text-primary">
                        {group.priceSummary}
                      </span>
                    </button>
                  </td>
                </tr>
                {expanded
                  ? group.versions.map((row) => (
                      <tr
                        key={`${group.familyKey}-${row.versionKey}`}
                        className="border-b last:border-0"
                      >
                        <td className="p-6 font-medium">{row.model}</td>
                        <td className="p-6 text-center">{row.type}</td>
                        <td className="p-6 text-center">{row.spec}</td>
                        <td className="p-6 text-center">
                          <span className="font-semibold text-primary">
                            {row.creditPrice}
                          </span>
                        </td>
                        <td className="p-6 text-center text-muted-foreground">
                          {row.billingNote}
                        </td>
                      </tr>
                    ))
                  : null}
              </tbody>
            );
          })}
        </table>
      </div>
    </>
  );
}
