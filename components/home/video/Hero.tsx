import AIVideoMiniStudio from "@/components/ai/AIVideoMiniStudio";
import HeroPhotoWall from "@/components/home/video/HeroPhotoWall";
import { VideoHeroMedia } from "@/components/home/video/Media";
import type { VideoTemplateHero } from "@/components/home/video/types";
import Image from "next/image";

interface HeroProps {
  hero: VideoTemplateHero;
}

export default function Hero({ hero }: HeroProps) {
  const videos = hero.videos ?? [];
  const images = hero.images ?? [];
  const showPhotoWall = videos.length === 0 && images.length > 0;

  return (
    <section
      data-video-hero-sentinel
      className="relative flex min-h-[100svh] flex-col items-center justify-center overflow-hidden"
    >
      {showPhotoWall ? (
        <HeroPhotoWall images={images} />
      ) : videos.length > 0 ? (
        <VideoHeroMedia videos={videos} />
      ) : (
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.18),transparent_28%),linear-gradient(180deg,rgba(3,7,18,0.94)_0%,rgba(3,7,18,1)_100%)]" />
      )}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-[1] h-40 bg-gradient-to-b from-black/70 via-black/24 to-transparent" />
      <div className="relative z-10 mx-auto w-full max-w-3xl px-4 py-32 sm:px-6 sm:py-36">
        <div className="mb-8 text-center sm:mb-10">
          <div
            data-aos="fade-up"
            className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/8 px-4 py-1.5 text-xs font-medium text-white/80 backdrop-blur-md"
          >
            <Image src="/logo.png" alt="Logo" width={28} height={28} />
            {hero.badge}
          </div>
          <h1
            data-aos="fade-up"
            className="text-3xl font-bold tracking-tight text-white text-balance sm:text-4xl lg:text-5xl"
          >
            {hero.title}
            <span className="mt-1 block text-primary">{hero.highlight}</span>
          </h1>
          <p
            data-aos="fade-up"
            className="mx-auto mt-4 max-w-xl text-base text-white/60 sm:text-lg"
          >
            {hero.description}
          </p>
        </div>
        <div className="w-full space-y-4">
          <div data-aos="fade-up">
            <AIVideoMiniStudio hero={hero} />
          </div>
        </div>
      </div>
    </section>
  );
}
