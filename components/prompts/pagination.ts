type PromptCategory = {
  id: string;
};

export const PROMPTS_CATEGORY_BATCH_SIZE = 2;

export function getVisiblePromptCategories({
  categories,
  activeCategory,
  visibleCategoryCount,
}: {
  categories: PromptCategory[];
  activeCategory: string;
  visibleCategoryCount: number;
}) {
  if (activeCategory === "all") {
    return categories.slice(0, visibleCategoryCount);
  }

  return categories.filter((category) => category.id === activeCategory);
}

export function getNextVisibleCategoryCount({
  currentVisibleCategoryCount,
  totalCategoryCount,
  batchSize = PROMPTS_CATEGORY_BATCH_SIZE,
}: {
  currentVisibleCategoryCount: number;
  totalCategoryCount: number;
  batchSize?: number;
}) {
  return Math.min(currentVisibleCategoryCount + batchSize, totalCategoryCount);
}

export function shouldShowLoadMoreCategories({
  activeCategory,
  visibleCategoryCount,
  totalCategoryCount,
}: {
  activeCategory: string;
  visibleCategoryCount: number;
  totalCategoryCount: number;
}) {
  return (
    activeCategory === "all" && visibleCategoryCount < totalCategoryCount
  );
}
