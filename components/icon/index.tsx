"use client";

import {
  Badge,
  CirclePlay,
  Copyright,
  Droplet,
  Feather,
  FileText,
  Image,
  ImagePlus,
  Sparkles,
  Video,
  WandSparkles,
  Zap,
  type LucideIcon,
} from "lucide-react";

const legacyIconMap = {
  RiCopyrightLine: Copyright,
  RiDropLine: Droplet,
  RiFileTextLine: FileText,
  RiFlashlightFill: Zap,
  RiHdLine: Badge,
  RiImageAddLine: ImagePlus,
  RiImageLine: Image,
  RiMagicLine: WandSparkles,
  RiPlayCircleLine: CirclePlay,
  RiQuillPenLine: Feather,
  RiSparkling2Line: Sparkles,
  RiVideoAddFill: Video,
} satisfies Record<string, LucideIcon>;

export default function Icon({
  name,
  className,
  onClick,
}: {
  name: string;
  className?: string;
  onClick?: () => void;
}) {
  const IconComponent = legacyIconMap[name as keyof typeof legacyIconMap];

  if (!IconComponent) {
    return null;
  }

  return (
    <IconComponent
      className={className ? `${className} cursor-pointer` : "cursor-pointer"}
      onClick={onClick}
      style={{ cursor: onClick ? "pointer" : "default" }}
    />
  );
}
