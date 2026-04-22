import PromptsPage from "@/components/prompts/PromptsPage";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "GptImage2Api – Fast & Reliable GPT Image 2 API for Developers",
  description:
    "GptImage2Api provides powerful GPT Image 2 API access for developers, startups, and businesses to generate high-quality AI images with simple REST endpoints. Build image generation apps, automate creative workflows, and integrate GPT Image 2 API into your products instantly.",
};

export default function Prompts() {
  return <PromptsPage />;
}
