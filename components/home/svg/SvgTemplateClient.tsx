"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronsLeftRight, RotateCcw } from "lucide-react";

const asset = (path: string) => path.replaceAll(" ", "%20");

export interface CompareSliderProps {
  after: string;
  afterAlt: string;
  before: string;
  beforeAlt: string;
  className?: string;
  imageClassName?: string;
  initial?: number;
  compareLabel: string;
  replayLabel?: string;
  withReplay?: boolean;
}

export interface SvgHeroSample {
  after: string;
  afterAlt: string;
  before: string;
  beforeAlt: string;
  iconClass: string;
  label: string;
  showPreviewLabel: string;
  title: string;
}

export function CompareSlider({
  after,
  afterAlt,
  before,
  beforeAlt,
  className = "",
  compareLabel,
  imageClassName = "object-contain",
  initial = 50,
  replayLabel = "",
  withReplay = false,
}: CompareSliderProps) {
  const [position, setPosition] = useState(initial);
  const [isReplaying, setIsReplaying] = useState(false);
  const replayFrameRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (replayFrameRef.current !== null) {
        cancelAnimationFrame(replayFrameRef.current);
      }
    };
  }, []);

  return (
    <div
      className={`group/preview relative overflow-hidden bg-white ${className}`}
    >
      <img
        alt={afterAlt}
        className={`absolute inset-0 h-full w-full ${imageClassName}`}
        draggable={false}
        src={asset(after)}
      />
      <div
        className="absolute inset-0 overflow-hidden bg-white"
        style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}
      >
        <img
          alt={beforeAlt}
          className={`absolute inset-0 h-full w-full ${imageClassName}`}
          draggable={false}
          src={asset(before)}
        />
      </div>
      <div
        className="pointer-events-none absolute inset-y-0 z-20 w-7 -translate-x-1/2"
        style={{ left: `${position}%` }}
      >
        <span
          className={`absolute inset-y-0 left-1/2 w-5 -translate-x-1/2 rounded-full bg-[linear-gradient(180deg,rgba(236,72,153,0.2),rgba(56,189,248,0.18))] blur-md transition-opacity duration-300 ${
            isReplaying ? "opacity-100" : "opacity-75"
          }`}
        />
        <span className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 rounded-full bg-gradient-to-b from-slate-900/70 via-pink-500/85 to-sky-400/80 shadow-[0_0_16px_rgba(236,72,153,0.55),0_0_26px_rgba(56,189,248,0.35)]" />
      </div>
      <div
        className="pointer-events-none absolute top-1/2 z-30 grid h-11 w-11 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-slate-200/95 bg-white text-slate-600 shadow-[0_10px_26px_rgba(15,23,42,0.08)] transition group-hover/preview:scale-105"
        style={{ left: `${position}%` }}
      >
        <ChevronsLeftRight className="h-5 w-5" />
      </div>
      {withReplay ? (
        <button
          className="absolute bottom-2 right-2 z-50 inline-flex h-8 items-center gap-1.5 rounded-full border border-slate-200/80 bg-white/75 px-3 text-xs font-semibold text-slate-500 shadow-[0_8px_18px_rgba(15,23,42,0.06)] backdrop-blur transition hover:bg-white hover:text-pink-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-400 focus-visible:ring-offset-2"
          onClick={() => {
            if (replayFrameRef.current !== null) {
              cancelAnimationFrame(replayFrameRef.current);
            }

            if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
              setPosition(50);
              setIsReplaying(false);
              return;
            }

            const sequence = [
              { from: 0, to: 100, duration: 1150 },
              { from: 100, to: 0, duration: 1150 },
              { from: 0, to: 50, duration: 850 },
            ];
            const startTime = Date.now();

            setIsReplaying(true);
            setPosition(0);

            const animate = () => {
              const elapsed = Date.now() - startTime;
              let cursor = 0;

              for (const step of sequence) {
                if (elapsed <= cursor + step.duration) {
                  const localProgress = (elapsed - cursor) / step.duration;
                  const eased =
                    localProgress < 0.5
                      ? 4 * localProgress * localProgress * localProgress
                      : 1 - Math.pow(-2 * localProgress + 2, 3) / 2;

                  setPosition(step.from + (step.to - step.from) * eased);
                  replayFrameRef.current = requestAnimationFrame(animate);
                  return;
                }

                cursor += step.duration;
              }

              setPosition(50);
              setIsReplaying(false);
              replayFrameRef.current = null;
            };

            replayFrameRef.current = requestAnimationFrame(animate);
          }}
          type="button"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          {replayLabel}
        </button>
      ) : null}
      <input
        aria-label={compareLabel}
        className="absolute inset-0 z-40 h-full w-full cursor-ew-resize opacity-0"
        max={100}
        min={0}
        onChange={(event) => setPosition(Number(event.target.value))}
        onInput={(event) => {
          if (replayFrameRef.current !== null) {
            cancelAnimationFrame(replayFrameRef.current);
            replayFrameRef.current = null;
            setIsReplaying(false);
          }

          setPosition(Number(event.currentTarget.value));
        }}
        onPointerDown={() => {
          if (replayFrameRef.current !== null) {
            cancelAnimationFrame(replayFrameRef.current);
            replayFrameRef.current = null;
            setIsReplaying(false);
          }
        }}
        type="range"
        value={position}
      />
    </div>
  );
}

export function SvgHeroPreview({
  compareLabel,
  replayLabel,
  samples,
}: {
  compareLabel: string;
  replayLabel: string;
  samples: SvgHeroSample[];
}) {
  const [activeSample, setActiveSample] = useState(1);
  const sample = samples[activeSample];

  return (
    <div className="relative mx-auto flex h-full w-full max-w-xl flex-col lg:max-w-none">
      <div className="flex min-h-[340px] w-full items-center justify-center lg:min-h-[430px]">
        <CompareSlider
          after={sample.after}
          afterAlt={sample.afterAlt}
          before={sample.before}
          beforeAlt={sample.beforeAlt}
          className="aspect-square w-full max-w-[380px] overflow-visible lg:max-w-[430px]"
          compareLabel={compareLabel}
          imageClassName="object-contain"
          replayLabel={replayLabel}
          withReplay
        />
      </div>
      <div className="relative mt-4 grid grid-cols-5 gap-2 lg:gap-2.5">
        {samples.map((item, index) => {
          const active = index === activeSample;

          return (
            <button
              aria-label={item.showPreviewLabel}
              aria-pressed={active}
              className={
                "flex min-h-[70px] min-w-0 flex-col items-center justify-center gap-1.5 rounded-lg bg-white/86 px-1.5 py-2 text-[10px] font-extrabold leading-none ring-1 backdrop-blur transition hover:-translate-y-0.5 hover:text-slate-900 hover:ring-pink-100 " +
                (active
                  ? "text-slate-950 ring-pink-200 shadow-[0_16px_38px_rgba(236,72,153,0.1)]"
                  : "text-slate-500 ring-slate-100/90 shadow-[0_12px_34px_rgba(15,23,42,0.035)]")
              }
              key={item.before}
              onClick={() => setActiveSample(index)}
              type="button"
            >
              <span
                className={`relative grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-md ${item.iconClass}`}
              >
                <img
                  alt=""
                  className="h-full w-full object-contain p-1"
                  src={asset(item.before)}
                />
              </span>
              <span className="w-full truncate text-center">{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
