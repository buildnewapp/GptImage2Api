import PromptsPage from "@/components/prompts/PromptsPage";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Seedance 2.0 Prompt Gallery | SdanceAI",
  description:
    "Explore real-world examples showcasing Seedance 2.0's multi-modal AI video creation capabilities. See prompts with input references and generated video results.",
};

export default function Prompts() {
  return <PromptsPage />;
}
