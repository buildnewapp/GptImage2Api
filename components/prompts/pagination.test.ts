import assert from "node:assert/strict";
import test from "node:test";

import {
  PROMPTS_CATEGORY_BATCH_SIZE,
  getNextVisibleCategoryCount,
  getVisiblePromptCategories,
  shouldShowLoadMoreCategories,
} from "@/components/prompts/pagination";

type PromptCategory = {
  id: string;
  title: string;
  titleEn: string;
  description: string;
  gradient: string;
  cases: unknown[];
};

const categories: PromptCategory[] = [
  {
    id: "basic",
    title: "Basic",
    titleEn: "Basic",
    description: "basic",
    gradient: "from-blue-500 to-cyan-500",
    cases: [],
  },
  {
    id: "consistency",
    title: "Consistency",
    titleEn: "Consistency",
    description: "consistency",
    gradient: "from-purple-500 to-pink-500",
    cases: [],
  },
  {
    id: "camera-motion",
    title: "Camera Motion",
    titleEn: "Camera Motion",
    description: "camera motion",
    gradient: "from-orange-500 to-red-500",
    cases: [],
  },
];

test("uses a batch size of 2 categories", () => {
  assert.equal(PROMPTS_CATEGORY_BATCH_SIZE, 2);
});

test("shows only the first batch in the all view", () => {
  const visible = getVisiblePromptCategories({
    categories,
    activeCategory: "all",
    visibleCategoryCount: PROMPTS_CATEGORY_BATCH_SIZE,
  });

  assert.deepEqual(
    visible.map((category) => category.id),
    ["basic", "consistency"],
  );
});

test("shows the selected category directly in single-category view", () => {
  const visible = getVisiblePromptCategories({
    categories,
    activeCategory: "camera-motion",
    visibleCategoryCount: PROMPTS_CATEGORY_BATCH_SIZE,
  });

  assert.deepEqual(
    visible.map((category) => category.id),
    ["camera-motion"],
  );
});

test("increases visible count by 2 and caps at the total count", () => {
  assert.equal(
    getNextVisibleCategoryCount({
      currentVisibleCategoryCount: PROMPTS_CATEGORY_BATCH_SIZE,
      totalCategoryCount: categories.length,
    }),
    3,
  );

  assert.equal(
    getNextVisibleCategoryCount({
      currentVisibleCategoryCount: categories.length,
      totalCategoryCount: categories.length,
    }),
    categories.length,
  );
});

test("only shows load-more in all view when categories remain", () => {
  assert.equal(
    shouldShowLoadMoreCategories({
      activeCategory: "all",
      visibleCategoryCount: PROMPTS_CATEGORY_BATCH_SIZE,
      totalCategoryCount: categories.length,
    }),
    true,
  );

  assert.equal(
    shouldShowLoadMoreCategories({
      activeCategory: "camera-motion",
      visibleCategoryCount: PROMPTS_CATEGORY_BATCH_SIZE,
      totalCategoryCount: categories.length,
    }),
    false,
  );

  assert.equal(
    shouldShowLoadMoreCategories({
      activeCategory: "all",
      visibleCategoryCount: categories.length,
      totalCategoryCount: categories.length,
    }),
    false,
  );
});
