"use client";

import { type PromptCase, promptCategories } from "@/components/prompts/promptsData";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import HeroPromptCard from "./HeroPromptCard";

type RandomPromptCase = {
  promptCase: PromptCase;
  categoryId: string;
  index: number;
};

type HeroPromptCarouselProps = {
  onPlayVideo: (src: string) => void;
};

const MIN_SWIPE_DISTANCE = 50;

function getRandomPromptCases(limit = 5): RandomPromptCase[] {
  const allCases: RandomPromptCase[] = [];

  promptCategories.forEach((category) => {
    category.cases.forEach((promptCase, index) => {
      allCases.push({ promptCase, categoryId: category.id, index });
    });
  });

  for (let i = allCases.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [allCases[i], allCases[j]] = [allCases[j], allCases[i]];
  }

  return allCases.slice(0, limit);
}

const HeroPromptCarousel = ({ onPlayVideo }: HeroPromptCarouselProps) => {
  const tPrompts = useTranslations("Prompts");
  const [previewIndex, setPreviewIndex] = useState(0);
  const [randomCases, setRandomCases] = useState<RandomPromptCase[]>([]);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  useEffect(() => {
    setRandomCases(getRandomPromptCases());
  }, []);

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (touchStart === null || touchEnd === null || randomCases.length === 0) return;

    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > MIN_SWIPE_DISTANCE;
    const isRightSwipe = distance < -MIN_SWIPE_DISTANCE;

    if (isLeftSwipe) {
      setPreviewIndex((i) => (i + 1) % randomCases.length);
    } else if (isRightSwipe) {
      setPreviewIndex((i) => (i - 1 + randomCases.length) % randomCases.length);
    }
  };

  const activeCase = randomCases[previewIndex];

  return (
    <div className="w-full min-w-0 max-w-full overflow-hidden flex flex-col">
      <div className="relative group w-full min-w-0">
        <div
          className="h-full w-full min-w-0"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          {activeCase ? (
            <HeroPromptCard
              promptCase={activeCase.promptCase}
              index={activeCase.index}
              categoryId={activeCase.categoryId}
              onPlayVideo={onPlayVideo}
              t={tPrompts}
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-white/60">
              PromptCard loading...
            </div>
          )}
        </div>

        {randomCases.length > 1 && (
          <>
            <button
              onClick={() =>
                setPreviewIndex((i) => (i - 1 + randomCases.length) % randomCases.length)
              }
              className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-black/50 hover:bg-black/70 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all duration-200 hover:scale-110 z-10"
              aria-label="Previous video"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <button
              onClick={() => setPreviewIndex((i) => (i + 1) % randomCases.length)}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-black/50 hover:bg-black/70 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all duration-200 hover:scale-110 z-10"
              aria-label="Next video"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </>
        )}

        {randomCases.length > 0 && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex max-w-full justify-center gap-2 px-2">
            {randomCases.map((_, index) => (
              <button
                key={index}
                onClick={() => setPreviewIndex(index)}
                className={cn(
                  "h-2 rounded-full transition-all duration-200",
                  previewIndex === index
                    ? "bg-blue-600 w-6"
                    : "bg-slate-600 hover:bg-slate-500 w-2",
                )}
                aria-label={`Go to video ${index + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default HeroPromptCarousel;
