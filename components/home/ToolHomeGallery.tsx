"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

export type GalleryItem = {
  title: string;
  src: string;
  thrumb: string;
  desc: string;
};

export default function ToolHomeGallery({ items }: { items: GalleryItem[] }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const activeItem = items[activeIndex] ?? items[0];

  useEffect(() => {
    if (items.length <= 1) {
      return;
    }

    const timer = window.setTimeout(() => {
      setActiveIndex((activeIndex + 1) % items.length);
    }, 5000);

    return () => window.clearTimeout(timer);
  }, [activeIndex, items.length]);

  if (!activeItem) {
    return null;
  }

  return (
    <div className="relative mx-auto w-full max-w-6xl">
      <div className="relative rounded-[28px] border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(255,251,245,0.82))] p-3 shadow-[0_36px_120px_rgba(15,23,42,0.18)] backdrop-blur dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(15,23,42,0.84),rgba(2,6,23,0.92))] dark:shadow-[0_40px_120px_rgba(2,6,23,0.5)] sm:rounded-[36px] sm:p-5">
        <div className="overflow-hidden rounded-[22px] border border-[#e1d6c4] bg-white shadow-sm dark:border-white/10 dark:bg-slate-900/80 sm:rounded-[26px]">
          <div className="relative aspect-[16/9] w-full bg-slate-100 dark:bg-slate-950">
            <Image
              src={activeItem.src}
              alt={activeItem.title}
              fill
              priority
              sizes="(min-width: 1280px) 1152px, calc(100vw - 32px)"
              className="object-cover"
            />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/82 via-slate-950/34 to-transparent px-5 pb-5 pt-20 text-left sm:px-7 sm:pb-7">
              <h3 className="max-w-3xl font-serif text-2xl leading-tight text-white sm:text-4xl">
                {activeItem.title}
              </h3>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-100 sm:text-base sm:leading-7">
                {activeItem.desc}
              </p>
            </div>
          </div>

          <div className="border-t border-[#e4dac9] bg-[#f9f5ee] p-3 dark:border-white/10 dark:bg-slate-950/80 sm:p-4">
            <div className="flex gap-3 overflow-x-auto pb-1">
              {items.map((item, index) => {
                const isActive = index === activeIndex;

                return (
                  <button
                    key={`${item.title}-${item.thrumb}`}
                    type="button"
                    aria-pressed={isActive}
                    onClick={() => setActiveIndex(index)}
                    className={
                      isActive
                        ? "relative min-w-[150px] overflow-hidden rounded-[18px] p-[2px] text-left opacity-100 shadow-sm sm:min-w-[180px]"
                        : "min-w-[150px] rounded-[18px] border border-white/80 bg-white/75 p-1.5 text-left opacity-75 transition hover:opacity-100 dark:border-white/10 dark:bg-white/5 sm:min-w-[180px]"
                    }
                  >
                    {isActive ? (
                      <span className="absolute -inset-1/2 bg-[conic-gradient(from_0deg,#10b981,#f59e0b,#06b6d4,#10b981)] [animation:spin_2.4s_linear_infinite]" />
                    ) : null}
                    <span
                      className={
                        isActive
                          ? "relative block rounded-[16px] bg-white p-1.5 dark:bg-slate-950"
                          : "block"
                      }
                    >
                      <span className="relative block aspect-[16/10] overflow-hidden rounded-[14px] bg-slate-100 dark:bg-slate-900">
                        <Image
                          src={item.thrumb}
                          alt={item.title}
                          fill
                          sizes="180px"
                          className="object-cover"
                        />
                      </span>
                      <span className="mt-2 block truncate px-1 text-xs font-semibold text-slate-700 dark:text-slate-200">
                        {item.title}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
