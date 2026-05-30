"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";

import { LazyPreviewVideo } from "@/components/home/video/Media";
import type { VideoTemplateHeroImagePreview } from "@/components/home/video/types";

interface HeroPhotoWallProps {
  images: Array<string | VideoTemplateHeroImagePreview>;
}

const VIDEO_FILE_RE = /\.(mp4|webm|mov|m4v)(?:[?#].*)?$/i;

export const HERO_PHOTO_WALL_COLUMN_COUNT = 10;
export const HERO_PHOTO_WALL_ITEMS_PER_COLUMN = 6;
export const HERO_PHOTO_WALL_COLUMN_START_STEP = 2;
export const HERO_PHOTO_WALL_COLUMN_PADDING_TOP = [
  28, 64, 48, 84, 68, 104, 88, 124, 108, 144,
] as const;
export const HERO_PHOTO_WALL_CARD_VARIANTS = [
  "aspect-[4/5] w-[120px] sm:w-[144px] lg:w-[192px]",
  "aspect-[3/4] w-[108px] sm:w-[132px] lg:w-[168px]",
  "aspect-[5/6] w-[96px] sm:w-[120px] lg:w-[144px]",
] as const;

export default function HeroPhotoWall({ images }: HeroPhotoWallProps) {
  const shouldReduceMotion = useReducedMotion();
  const [displayImages, setDisplayImages] = useState(images);

  useEffect(() => {
    if (images.length < 2) {
      setDisplayImages(images);
      return;
    }

    const nextImages = [...images];

    for (let index = nextImages.length - 1; index > 0; index -= 1) {
      const randomIndex = Math.floor(Math.random() * (index + 1));
      [nextImages[index], nextImages[randomIndex]] = [
        nextImages[randomIndex],
        nextImages[index],
      ];
    }

    setDisplayImages(nextImages);
  }, [images]);

  const photoColumns = useMemo(
    () =>
      Array.from({ length: HERO_PHOTO_WALL_COLUMN_COUNT }, (_, columnIndex) => {
        if (displayImages.length === 0) {
          return [];
        }

        const startIndex =
          (columnIndex * HERO_PHOTO_WALL_COLUMN_START_STEP) %
          displayImages.length;
        const columnImages = Array.from(
          { length: HERO_PHOTO_WALL_ITEMS_PER_COLUMN },
          (_, imageIndex) =>
            displayImages[(startIndex + imageIndex) % displayImages.length],
        );

        return [...columnImages, ...columnImages, ...columnImages];
      }),
    [displayImages],
  );

  return (
    <div className="absolute inset-0 overflow-hidden bg-[#050b14]">
      <div className="absolute left-1/2 top-1/2 flex min-w-[156vw] h-[168vh] -translate-x-1/2 -translate-y-1/2 -rotate-[14deg] items-start justify-center gap-2 sm:gap-3 lg:gap-4">
        {photoColumns.map((columnImages, columnIndex) => (
          <div
            key={`photo-column-${columnIndex}`}
            className={`${columnIndex >= 4 ? "hidden sm:block" : ""} overflow-hidden`}
            style={{
              paddingTop: `${HERO_PHOTO_WALL_COLUMN_PADDING_TOP[columnIndex] ?? HERO_PHOTO_WALL_COLUMN_PADDING_TOP[HERO_PHOTO_WALL_COLUMN_PADDING_TOP.length - 1]}px`,
            }}
          >
            <motion.div
              animate={
                shouldReduceMotion
                  ? undefined
                  : {
                      y:
                        columnIndex % 2 === 0
                          ? ["-33.333%", "-66.666%"]
                          : ["-66.666%", "-33.333%"],
                    }
              }
              transition={{
                duration: 24 + columnIndex * 3,
                ease: "linear",
                repeat: Number.POSITIVE_INFINITY,
                delay: -columnIndex * 2.4,
              }}
              className="flex transform-gpu flex-col gap-2 will-change-transform sm:gap-3 lg:gap-4"
            >
              {columnImages.map((image, imageIndex) => {
                const isPreview = typeof image !== "string";
                const src = isPreview ? image.cover : image;
                const videoSrc = isPreview ? image.src : src;
                const title = isPreview ? image.title : undefined;
                const imageKey = isPreview
                  ? `${image.cover}-${image.src}-${image.title ?? ""}`
                  : image;

                return (
                  <div
                    key={`${imageKey}-${columnIndex}-${imageIndex}`}
                    onMouseEnter={(event) => {
                      if (!isPreview) {
                        return;
                      }

                      const video = event.currentTarget.querySelector(
                        "video[data-hover-video-src]",
                      );

                      if (!(video instanceof HTMLVideoElement)) {
                        return;
                      }

                      if (!video.src) {
                        video.src = video.dataset.hoverVideoSrc ?? "";
                      }

                      void video.play();
                    }}
                    onMouseLeave={(event) => {
                      if (!isPreview) {
                        return;
                      }

                      const video = event.currentTarget.querySelector(
                        "video[data-hover-video-src]",
                      );

                      if (video instanceof HTMLVideoElement) {
                        video.pause();
                        video.currentTime = 0;
                      }
                    }}
                    className={`group relative overflow-hidden rounded-[1rem] border border-white/12 bg-white/6 shadow-[0_20px_40px_-24px_rgba(15,23,42,0.65)] ${HERO_PHOTO_WALL_CARD_VARIANTS[(imageIndex + columnIndex) % HERO_PHOTO_WALL_CARD_VARIANTS.length]}`}
                  >
                    {isPreview ? (
                      <>
                        <img
                          src={src}
                          alt={title ?? "AI-generated showcase sample"}
                          loading="lazy"
                          decoding="async"
                          fetchPriority="low"
                          className="h-full w-full transform-gpu object-cover transition-transform duration-200 ease-out will-change-transform group-hover:scale-[1.2]"
                        />
                        <video
                          data-hover-video-src={videoSrc}
                          muted
                          playsInline
                          loop
                          preload="none"
                          poster={src}
                          aria-label={title}
                          className="absolute inset-0 h-full w-full transform-gpu object-cover opacity-0 transition-[opacity,transform] duration-200 ease-out will-change-transform group-hover:scale-[1.2] group-hover:opacity-100"
                        />
                      </>
                    ) : VIDEO_FILE_RE.test(src) ? (
                      <LazyPreviewVideo
                        src={src}
                        loadDelayMs={700 + ((imageIndex + columnIndex) % 8) * 120}
                        rootMargin="80px 0px"
                        className="h-full w-full transform-gpu object-cover transition-transform duration-200 ease-out will-change-transform group-hover:scale-[1.2]"
                      />
                    ) : (
                      <img
                        src={src}
                        alt="AI-generated showcase sample"
                        loading="lazy"
                        decoding="async"
                        fetchPriority="low"
                        className="h-full w-full transform-gpu object-cover transition-transform duration-200 ease-out will-change-transform group-hover:scale-[1.2]"
                      />
                    )}
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/18 via-transparent to-white/10 opacity-80" />
                  </div>
                );
              })}
            </motion.div>
          </div>
        ))}
      </div>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(8,13,24,0.14)_0%,rgba(8,13,24,0.58)_42%,rgba(3,6,12,0.92)_100%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(3,6,12,0.78)_10%,transparent_42%,rgba(3,6,12,0.88)_92%)]" />
    </div>
  );
}
