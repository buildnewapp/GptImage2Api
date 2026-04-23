import { Metadata } from "next";

import promptsJson from "@/content/prompts.json";

import TestPromptsTable from "./TestPromptsTable";

type PromptMedia = {
  thumbnail?: string;
  url?: string;
};

type PromptItem = {
  id: string;
  media?: PromptMedia[];
};

type PromptData = {
  items: PromptItem[];
};

export const metadata: Metadata = {
  title: "Test Prompts",
};

export default function TestPage() {
  const rows = (promptsJson as PromptData).items.map((item) => ({
    id: item.id,
    thumbnailUrl: item.media?.[0]?.thumbnail ?? "",
    imageUrl: item.media?.[0]?.url ?? "",
  }));

  return (
    <div className="mx-auto w-full max-w-[1600px] px-6 py-8">
      <div className="mb-6 space-y-2">
        <h1 className="text-3xl font-semibold">/test</h1>
        <p className="text-sm text-muted-foreground">
          临时页面，直接展示 content/prompts.json 中的全部数据。
        </p>
      </div>

      <TestPromptsTable rows={rows} />
    </div>
  );
}
