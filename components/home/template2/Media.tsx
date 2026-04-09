"use client";

import { useEffect, useState } from "react";
import { Clock3, X } from "lucide-react";

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import type { HomeTemplate2ShowcaseVideo } from "@/components/home/template2/types";

interface HomeTemplate2HeroBackgroundProps {
  videos: readonly string[];
}

interface Template2ShowcaseMediaProps {
  videos: readonly HomeTemplate2ShowcaseVideo[];
}

export function Template2HeroMedia({
  videos,
}: HomeTemplate2HeroBackgroundProps) {
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
        data-home-template2-hero-rotator
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

export function Template2ShowcaseMedia({
  videos,
}: Template2ShowcaseMediaProps) {
  const [selectedVideo, setSelectedVideo] =
    useState<HomeTemplate2ShowcaseVideo | null>(null);

  return (
    <>
      <div className="mb-12 grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
        {videos.map((video,index) => (
          <div key={video.src} data-aos="fade-up" data-aos-delay={50+index*200} >
            <button
              type="button"
              aria-label={`Open ${video.title} preview`}
              onClick={() => setSelectedVideo(video)}
              className="group w-full overflow-hidden rounded-[calc(var(--radius)+0.45rem)] border border-border/85 bg-card text-left text-card-foreground shadow-[0_28px_80px_-50px_rgba(15,23,42,0.5)] backdrop-blur-md transition-all hover:-translate-y-1 hover:shadow-[0_28px_70px_-42px_rgba(15,23,42,0.58)]"
            >
              <div className="relative aspect-video overflow-hidden">
                <video
                  src={video.src}
                  autoPlay
                  muted
                  playsInline
                  loop
                  preload="metadata"
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"></div>
                <div className="absolute left-2 top-2">
                  <span className="inline-flex items-center rounded-md bg-black/60 px-2 py-1 text-xs font-medium text-white backdrop-blur-sm">
                    {video.category}
                  </span>
                </div>
                <div className="absolute right-2 top-2">
                  <span className="inline-flex items-center rounded-md bg-black/60 px-2 py-1 text-xs font-medium text-white backdrop-blur-sm">
                    <Clock3 className="mr-1 h-3 w-3" />
                    {video.duration}
                  </span>
                </div>
              </div>
              <div className="p-4">
                <h3 className="text-lg font-semibold">{video.title}</h3>
                <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">
                  {video.prompt}
                </p>
                <div className="mt-4 flex flex-wrap gap-2 text-xs">
                  <span className="rounded-full border border-border/70 bg-muted/55 px-2.5 py-1 text-foreground/80">
                    Duration: {video.duration}
                  </span>
                  <span className="rounded-full border border-border/70 bg-muted/55 px-2.5 py-1 text-foreground/80">
                    Resolution: {video.resolution}
                  </span>
                </div>
              </div>
            </button>
          </div>
        ))}
      </div>

      <Dialog
        open={selectedVideo !== null}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedVideo(null);
          }
        }}
      >
        <DialogContent
          showCloseButton={false}
          className="max-w-[min(1120px,calc(100vw-2rem))] gap-0 overflow-hidden rounded-[2rem] border border-[#1f6bff]/60 bg-black p-0 text-white shadow-[0_30px_120px_-40px_rgba(2,8,23,0.92)]"
        >
          {selectedVideo ? (
            <>
              <DialogTitle className="sr-only">{selectedVideo.title}</DialogTitle>
              <div className="relative bg-black">
                <DialogClose
                  aria-label="Close preview"
                  className="absolute right-4 top-4 z-10 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/18 text-white backdrop-blur-md transition-colors hover:bg-white/28 focus:outline-none focus:ring-2 focus:ring-white/60"
                >
                  <X className="h-5 w-5" />
                </DialogClose>
                <div className="flex max-h-[72vh] min-h-[280px] items-center justify-center bg-black">
                  <video
                    key={selectedVideo.src}
                    src={selectedVideo.src}
                    controls
                    autoPlay
                    playsInline
                    className="max-h-[72vh] w-full bg-black object-contain"
                  />
                </div>
              </div>
              <div className="border-t border-[#1f6bff]/70 px-5 py-5 sm:px-6">
                <div className="text-2xl font-semibold tracking-tight text-white">
                  {selectedVideo.title}
                </div>
                <div className="mt-4 flex flex-wrap gap-2 text-xs text-white/85">
                  <span className="rounded-full border border-white/12 bg-white/6 px-3 py-1.5">
                    Duration: {selectedVideo.duration}
                  </span>
                  <span className="rounded-full border border-white/12 bg-white/6 px-3 py-1.5">
                    Resolution: {selectedVideo.resolution}
                  </span>
                </div>
                <p className="mt-5 text-base leading-7 text-white/90">
                  <span className="font-semibold text-white">Prompt:</span>{" "}
                  {selectedVideo.prompt}
                </p>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
