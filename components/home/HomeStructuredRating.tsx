import { Star } from "lucide-react";
import { getTranslations } from "next-intl/server";

type StructuredDataRating = {
  count: string;
  label: string;
  value: string;
};

export default async function HomeStructuredRating({
  className = "",
}: {
  className?: string;
}) {
  const t = await getTranslations("StructuredData");
  const rating = t.raw("rating") as StructuredDataRating;

  return (
    <div
      className={`flex flex-wrap items-center justify-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200 ${className}`}
    >
      <span className="flex items-center gap-0.5 text-amber-400">
        {Array.from({ length: 5 }).map((_, index) => (
          <Star
            aria-hidden="true"
            className="h-4 w-4 fill-current"
            key={index}
          />
        ))}
      </span>
      <span>
        {t("rating.label", {
          count: rating.count,
          value: rating.value,
        })}
      </span>
    </div>
  );
}
