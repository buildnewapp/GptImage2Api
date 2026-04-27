"use client";

import { useEffect, useState } from "react";
import { Clock3, X } from "lucide-react";

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import type { VideoTemplateShowcaseItem } from "@/components/home/video/types";

const IMAGE_FILE_RE = /\.(png|jpe?g|webp|gif|avif|svg)(?:[?#].*)?$/i;

interface VideoTemplateHeroBackgroundProps {
  videos: readonly string[];
}

interface VideoShowcaseMediaProps {
  items: readonly VideoTemplateShowcaseItem[];
}

export function VideoHeroMedia({
  videos,
}: VideoTemplateHeroBackgroundProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (videos.length < 2) {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      setActiveIndex((currentIndex) => (currentIndex + 1) % videos.length);
    }, 4500);

    return () => window.clearInterval(intervalId);
  }, [videos]);

  const activeVideo = videos[activeIndex] ?? videos[0];

  return (
    <>
      <div className="absolute inset-0">
        <video
          key={activeVideo}
          src={activeVideo}
          autoPlay
          muted
          playsInline
          preload="auto"
          className="absolute inset-0 h-full w-full object-cover"
        />
      </div>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]"></div>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(0,0,0,0.4)_100%)]"></div>
      <div
        data-video-hero-rotator
        className="absolute inset-x-0 bottom-6 z-10 flex justify-center px-4"
      >
        <div className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-black/20 px-3 py-2 backdrop-blur-md">
          {videos.map((video, index) => {
            const isActive = index === activeIndex;

            return (
              <button
                key={video}
                type="button"
                aria-label={`Play hero background ${index + 1}`}
                onClick={() => setActiveIndex(index)}
                className={`h-2.5 rounded-full transition-all duration-300 ${
                  isActive
                    ? "w-8 bg-white shadow-[0_0_18px_rgba(255,255,255,0.55)]"
                    : "w-2.5 bg-white/40 hover:bg-white/70"
                }`}
              />
            );
          })}
        </div>
      </div>
    </>
  );
}

export function VideoShowcaseMedia({
  items,
}: VideoShowcaseMediaProps) {
  const [selectedItem, setSelectedItem] =
    useState<VideoTemplateShowcaseItem | null>(null);
  const selectedItemIsImage =
    selectedItem ? IMAGE_FILE_RE.test(selectedItem.src) : false;

  return (
    <>
      <div className="mb-12 grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
        {items.map((item, index) => {
          const isImage = IMAGE_FILE_RE.test(item.src);

          return (
            <div key={item.src} data-aos="fade-up" data-aos-delay={50 + index * 200}>
              <button
                type="button"
                aria-label={`Open ${item.title} preview`}
                onClick={() => setSelectedItem(item)}
                className="group w-full overflow-hidden rounded-[calc(var(--radius)+0.45rem)] border border-border/85 bg-card text-left text-card-foreground shadow-[0_28px_80px_-50px_rgba(15,23,42,0.5)] backdrop-blur-md transition-all hover:-translate-y-1 hover:shadow-[0_28px_70px_-42px_rgba(15,23,42,0.58)]"
              >
                <div className="relative aspect-video overflow-hidden">
                  {isImage ? (
                    <img
                      src={item.src}
                      alt={`${item.title} preview image`}
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <video
                      src={item.src}
                      autoPlay
                      muted
                      playsInline
                      loop
                      preload="metadata"
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"></div>
                  <div className="absolute left-2 top-2">
                    <span className="inline-flex items-center rounded-md bg-black/60 px-2 py-1 text-xs font-medium text-white backdrop-blur-sm">
                      {item.category}
                    </span>
                  </div>
                  {!isImage && item.duration ? (
                    <div className="absolute right-2 top-2">
                      <span className="inline-flex items-center rounded-md bg-black/60 px-2 py-1 text-xs font-medium text-white backdrop-blur-sm">
                        <Clock3 className="mr-1 h-3 w-3" />
                        {item.duration}
                      </span>
                    </div>
                  ) : null}
                </div>
                <div className="p-4">
                  <h3 className="text-lg font-semibold">{item.title}</h3>
                  {item.prompt ? (
                    <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">
                      {item.prompt}
                    </p>
                  ) : null}
                  <div className="mt-4 flex flex-wrap gap-2 text-xs">
                    {!isImage && item.duration ? (
                      <span className="rounded-full border border-border/70 bg-muted/55 px-2.5 py-1 text-foreground/80">
                        Duration: {item.duration}
                      </span>
                    ) : null}
                    {item.resolution ? (
                      <span className="rounded-full border border-border/70 bg-muted/55 px-2.5 py-1 text-foreground/80">
                        Resolution: {item.resolution}
                      </span>
                    ) : null}
                  </div>
                </div>
              </button>
            </div>
          );
        })}
      </div>

      <Dialog
        open={selectedItem !== null}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedItem(null);
          }
        }}
      >
        <DialogContent
          showCloseButton={false}
          className="max-h-[calc(100svh-20rem)] w-[min(96vw,1120px)] max-w-[1120px] sm:max-w-[1120px] gap-0 overflow-hidden rounded-[1.5rem] border border-[#1f6bff]/60 bg-black p-0 text-white shadow-[0_30px_120px_-40px_rgba(2,8,23,0.92)] sm:max-h-[90vh] sm:rounded-[2rem]"
        >
          {selectedItem ? (
            <>
              <DialogTitle className="sr-only">{selectedItem.title}</DialogTitle>
              <div className="relative flex max-h-[calc(100svh-20rem)] flex-col bg-black sm:max-h-[90vh]">
                <DialogClose
                  aria-label="Close preview"
                  className="absolute right-4 top-4 z-10 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/18 text-white backdrop-blur-md transition-colors hover:bg-white/28 focus:outline-none focus:ring-2 focus:ring-white/60"
                >
                  <X className="h-5 w-5" />
                </DialogClose>
                <div className="flex min-h-[140px] flex-1 items-center justify-center bg-black sm:min-h-[280px]">
                  {IMAGE_FILE_RE.test(selectedItem.src) ? (
                    <img
                      src={selectedItem.src}
                      alt={`${selectedItem.title} preview image`}
                      className="max-h-full w-full bg-black object-contain"
                    />
                  ) : (
                    <video
                      key={selectedItem.src}
                      src={selectedItem.src}
                      controls
                      autoPlay
                      playsInline
                      className="max-h-full w-full bg-black object-contain"
                    />
                  )}
                </div>
                <div className="max-h-[24svh] overflow-y-auto border-t border-[#1f6bff]/70 px-4 py-4 sm:max-h-none sm:px-6 sm:py-5">
                  <div className="text-2xl font-semibold tracking-tight text-white">
                    {selectedItem.title}
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2 text-xs text-white/85">
                    {!selectedItemIsImage && selectedItem.duration ? (
                      <span className="rounded-full border border-white/12 bg-white/6 px-3 py-1.5">
                        Duration: {selectedItem.duration}
                      </span>
                    ) : null}
                    {selectedItem.resolution ? (
                      <span className="rounded-full border border-white/12 bg-white/6 px-3 py-1.5">
                        Resolution: {selectedItem.resolution}
                      </span>
                    ) : null}
                  </div>
                  {selectedItem.prompt ? (
                    <p className="mt-5 text-base leading-7 text-white/90">
                      <span className="font-semibold text-white">Prompt:</span>{" "}
                      {selectedItem.prompt}
                    </p>
                  ) : null}
                </div>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
