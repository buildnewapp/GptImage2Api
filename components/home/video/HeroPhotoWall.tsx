"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useMemo } from "react";

interface HeroPhotoWallProps {
  images: string[];
}

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
  const shuffledImages = useMemo(() => {
    const nextImages = [...images];

    for (let index = nextImages.length - 1; index > 0; index -= 1) {
      const randomIndex = Math.floor(Math.random() * (index + 1));
      [nextImages[index], nextImages[randomIndex]] = [
        nextImages[randomIndex],
        nextImages[index],
      ];
    }

    return nextImages;
  }, [images]);

  const photoColumns = useMemo(
    () =>
      Array.from({ length: HERO_PHOTO_WALL_COLUMN_COUNT }, (_, columnIndex) => {
        if (shuffledImages.length === 0) {
          return [];
        }

        const startIndex =
          (columnIndex * HERO_PHOTO_WALL_COLUMN_START_STEP) %
          shuffledImages.length;
        const columnImages = Array.from(
          { length: HERO_PHOTO_WALL_ITEMS_PER_COLUMN },
          (_, imageIndex) =>
            shuffledImages[(startIndex + imageIndex) % shuffledImages.length],
        );

        return [...columnImages, ...columnImages, ...columnImages];
      }),
    [shuffledImages],
  );

  return (
    <div className="absolute inset-0 overflow-hidden bg-[#050b14]">
      <div className="absolute left-1/2 top-1/2 flex min-w-[156vw] h-[168vh] -translate-x-1/2 -translate-y-1/2 -rotate-[14deg] items-start justify-center gap-2 sm:gap-3 lg:gap-4">
        {photoColumns.map((columnImages, columnIndex) => (
          <div
            key={`photo-column-${columnIndex}`}
            className="overflow-hidden"
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
              {columnImages.map((src, imageIndex) => (
                <div
                  key={`${src}-${columnIndex}-${imageIndex}`}
                  className={`group relative overflow-hidden rounded-[1rem] border border-white/12 bg-white/6 shadow-[0_20px_40px_-24px_rgba(15,23,42,0.65)] ${HERO_PHOTO_WALL_CARD_VARIANTS[(imageIndex + columnIndex) % HERO_PHOTO_WALL_CARD_VARIANTS.length]}`}
                >
                  <img
                    src={src}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    fetchPriority="low"
                    className="h-full w-full transform-gpu object-cover transition-transform duration-200 ease-out will-change-transform group-hover:scale-[1.2]"
                  />
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/18 via-transparent to-white/10 opacity-80" />
                </div>
              ))}
            </motion.div>
          </div>
        ))}
      </div>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(8,13,24,0.14)_0%,rgba(8,13,24,0.58)_42%,rgba(3,6,12,0.92)_100%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(3,6,12,0.78)_10%,transparent_42%,rgba(3,6,12,0.88)_92%)]" />
    </div>
  );
}
