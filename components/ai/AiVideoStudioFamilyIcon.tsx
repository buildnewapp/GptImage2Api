import {
  ByteDance,
  Google,
  Grok,
  Hailuo,
  Jimeng,
  Kling,
  NanoBanana,
  Qwen,
  Runway,
  Sora,
} from "@lobehub/icons";
import type { AiVideoStudioFamilyIconKey } from "@/config/ai-video-studio";

type AiVideoStudioFamilyIconProps = {
  className?: string;
  icon: AiVideoStudioFamilyIconKey;
  size?: number;
};

export function AiVideoStudioFamilyIcon({
  className,
  icon,
  size = 28,
}: AiVideoStudioFamilyIconProps) {
  switch (icon) {
    case "bytedance":
      return <ByteDance.Color className={className} size={size} />;
    case "google":
      return <Google.Color className={className} size={size} />;
    case "grok":
      return <Grok className={className} size={size} />;
    case "hailuo":
      return <Hailuo.Color className={className} size={size} />;
    case "jimeng":
      return <Jimeng.Color className={className} size={size} />;
    case "kling":
      return <Kling.Color className={className} size={size} />;
    case "nano-banana":
      return <NanoBanana.Color className={className} size={size} />;
    case "qwen":
      return <Qwen.Color className={className} size={size} />;
    case "runway":
      return <Runway.Avatar className={className} size={size} />;
    case "sora":
      return <Sora.Color className={className} size={size} />;
    default:
      return null;
  }
}
