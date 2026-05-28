"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import {
  ArrowRight,
  Check,
  ChevronsLeftRight,
  CirclePlay,
  CloudUpload,
  Crown,
  Download,
  FileImage,
  FileText,
  Image as ImageIcon,
  Layers,
  MousePointer2,
  RotateCcw,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Star,
  Upload,
  Waypoints,
  WandSparkles,
  Zap,
} from "lucide-react";

const asset = (path: string) => path.replaceAll(" ", "%20");

const heroSamples = [
  {
    before:
      "https://file.tikdek.com/temp/svg/compare/outline_transparent/01_iconic_gears_and_control_panel_design_white_bg 1.png",
    after: "https://file.tikdek.com/temp/svg/compare/after/2.svg",
    iconClass: "bg-slate-50",
  },
  {
    before:
      "https://file.tikdek.com/temp/svg/compare/origin_transparent/03_bold_fox_logo_illustration_on_white_white_bg 1.png",
    after: "https://file.tikdek.com/temp/svg/compare/after/3-transparent.svg",
    iconClass: "bg-pink-50",
  },
  {
    before:
      "https://file.tikdek.com/temp/svg/compare/outline_transparent/06_fierce_tribal_dragon_emblem_white_bg 1.png",
    after: "https://file.tikdek.com/temp/svg/compare/after/4.svg",
    iconClass: "bg-slate-50",
  },
  {
    before:
      "https://file.tikdek.com/temp/svg/compare/outline_transparent/10_symmetrical_floral_medallion_with_neon_accents_white_bg 1.png",
    after: "https://file.tikdek.com/temp/svg/compare/after/5.svg",
    iconClass: "bg-slate-50",
  },
  {
    before:
      "https://file.tikdek.com/temp/svg/compare/outline_transparent/09_stylized_portrait_with_cyan_accents_white_bg 1.png",
    after: "https://file.tikdek.com/temp/svg/compare/after/8.svg",
    iconClass: "bg-slate-50",
  },
];

const useCases = [
  {
    before:
      "https://file.tikdek.com/temp/svg/compare/origin_transparent/02_heraldic_crest_with_owls_and_symbolism_white_bg 1.png",
    after: "https://file.tikdek.com/temp/svg/compare/after/2.svg",
  },
  {
    before:
      "https://file.tikdek.com/temp/svg/compare/origin_transparent/04_desert_canyon_with_winding_turquoise_river_white_bg 1.png",
    after: "https://file.tikdek.com/temp/svg/compare/after/4.svg",
  },
  {
    before:
      "https://file.tikdek.com/temp/svg/compare/origin_transparent/05_cheerful_red_panda_on_scooter_white_bg 1.png",
    after: "https://file.tikdek.com/temp/svg/compare/after/5.svg",
  },
  {
    before:
      "https://file.tikdek.com/temp/svg/compare/origin_transparent/07_cozy_a_frame_cabin_in_the_woods_white_bg 1.png",
    after: "https://file.tikdek.com/temp/svg/compare/after/7.svg",
  },
  {
    before:
      "https://file.tikdek.com/temp/svg/compare/origin_transparent/08_confident_young_woman_in_stylized_portrait_white_bg 1.png",
    after: "https://file.tikdek.com/temp/svg/compare/after/8.svg",
  },
];

const steps = [
  {
    icon: Upload,
  },
  {
    icon: SlidersHorizontal,
  },
  {
    icon: Download,
  },
];

const conversionGroups = [
  {
    columns: "lg:grid-cols-3",
    items: [
      {
        href: "/png-to-svg",
        from: "PNG",
        to: "SVG",
      },
      {
        href: "/jpg-to-svg",
        from: "JPG",
        to: "SVG",
      },
      {
        href: "/webp-to-svg",
        from: "WebP",
        to: "SVG",
      },
    ],
  },
  {
    columns: "lg:grid-cols-1",
    items: [
      {
        href: "/svg-to-png",
        from: "SVG",
        to: "PNG",
      },
    ],
  },
  {
    columns: "lg:grid-cols-2",
    items: [
      {
        href: "/jpg-to-webp",
        from: "JPG",
        to: "WebP",
      },
      {
        href: "/webp-to-jpg",
        from: "WebP",
        to: "JPG",
      },
    ],
  },
];

const workflowCards = [
  {
    icon: Crown,
    iconClass: "bg-rose-50 text-rose-500",
  },
  {
    icon: Layers,
    iconClass: "bg-blue-50 text-blue-500",
  },
  {
    icon: MousePointer2,
    iconClass: "bg-amber-50 text-amber-500",
  },
  {
    icon: WandSparkles,
    iconClass: "bg-emerald-50 text-emerald-500",
  },
  {
    icon: Sparkles,
    iconClass: "bg-sky-50 text-sky-500",
  },
];

const resources = [
  {
    href: "/guides/image-to-svg-best-practices",
    image: "https://file.tikdek.com/temp/svg/resources/image-to-svg-best-practices-thumbnail.png",
    icon: Crown,
  },
  {
    href: "/guides/svg-vs-png",
    image: "https://file.tikdek.com/temp/svg/resources/svg-vs-png-comparison-thumbnail.png",
    icon: FileImage,
  },
  {
    href: "/guides/logo-to-svg",
    image: "https://file.tikdek.com/temp/svg/resources/logo-to-svg-conversion-thumbnail.png",
    icon: SlidersHorizontal,
  },
  {
    href: "/guides/svg-for-cricut-laser-cutting",
    image: "https://file.tikdek.com/temp/svg/resources/svg-for-cricut-cutting-thumbnail.png",
    icon: FileText,
  },
];

interface CompareSliderProps {
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

function CompareSlider({
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
        <span
          className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 rounded-full bg-gradient-to-b from-slate-900/70 via-pink-500/85 to-sky-400/80 shadow-[0_0_16px_rgba(236,72,153,0.55),0_0_26px_rgba(56,189,248,0.35)]"
        />
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

function FormatFileIcon({ format }: { format: string }) {
  const settings =
    format === "SVG"
      ? {
          className: "border-pink-100 bg-pink-50 text-pink-500",
          corner: "border-pink-100 bg-pink-100/40",
          icon: Waypoints,
        }
      : format === "WebP"
        ? {
            className: "border-violet-100 bg-violet-50 text-violet-500",
            corner: "border-violet-100 bg-violet-100/40",
            icon: CirclePlay,
          }
        : format === "PNG"
          ? {
              className: "border-emerald-100 bg-emerald-50 text-emerald-500",
              corner: "border-emerald-100 bg-emerald-100/40",
              icon: ImageIcon,
            }
          : {
              className: "border-blue-100 bg-blue-50 text-blue-500",
              corner: "border-blue-100 bg-blue-100/40",
              icon: ImageIcon,
            };
  const Icon = settings.icon;

  return (
    <span
      aria-hidden="true"
      className={`relative grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-lg border ${settings.className}`}
    >
      <span
        className={`absolute right-0 top-0 h-4 w-4 rounded-bl-lg border-b border-l ${settings.corner}`}
      />
      <Icon className="h-6 w-6" />
    </span>
  );
}

function FormatFlowIcon({ from, to }: { from: string; to: string }) {
  return (
    <div className="mb-8 flex items-center gap-3">
      <FormatFileIcon format={from} />
      <span className="flex min-w-8 flex-1 items-center text-pink-400">
        <span className="h-0 flex-1 border-t-2 border-dotted border-pink-300" />
        <ArrowRight className="-ml-1 h-6 w-6 stroke-[2.5]" />
      </span>
      <FormatFileIcon format={to} />
    </div>
  );
}

export default function SvgTemplate() {
  const t = useTranslations("SvgTemplate");
  const [activeSample, setActiveSample] = useState(1);
  const heroSampleCopy = t.raw("hero.samples") as Array<{
    label: string;
    title: string;
  }>;
  const useCaseCopy = t.raw("useCases.items") as Array<{
    afterAlt: string;
    beforeAlt: string;
    description: string;
    title: string;
  }>;
  const stepCopy = t.raw("steps.items") as Array<{
    description: string;
    title: string;
  }>;
  const conversionGroupCopy = t.raw("conversion.groups") as Array<{
    description: string;
    eyebrow: string;
    items: Array<{ description: string; title: string }>;
    title: string;
  }>;
  const workflowCardCopy = t.raw("workflows.items") as Array<{
    description: string;
    title: string;
  }>;
  const resourceCopy = t.raw("resources.items") as Array<{
    description: string;
    title: string;
  }>;
  const localizedHeroSamples = heroSamples.map((sample, index) => ({
    ...sample,
    ...heroSampleCopy[index],
  }));
  const localizedUseCases = useCases.map((item, index) => ({
    ...item,
    ...useCaseCopy[index],
  }));
  const localizedSteps = steps.map((step, index) => ({
    ...step,
    ...stepCopy[index],
  }));
  const localizedConversionGroups = conversionGroups.map((group, index) => {
    const copy = conversionGroupCopy[index];

    return {
      ...group,
      ...copy,
      items: group.items.map((item, itemIndex) => ({
        ...item,
        ...copy.items[itemIndex],
      })),
    };
  });
  const localizedWorkflowCards = workflowCards.map((card, index) => ({
    ...card,
    ...workflowCardCopy[index],
  }));
  const localizedResources = resources.map((resource, index) => ({
    ...resource,
    ...resourceCopy[index],
  }));
  const localizedFaqs = t.raw("faq.items") as Array<{
    answer: string;
    question: string;
  }>;
  const rating = t.raw("hero.rating") as {
    count: string;
    label: string;
    value: string;
  };
  const sample = localizedHeroSamples[activeSample];

  return (
    <>
      <script type="application/ld+json">
        {JSON.stringify(t.raw("jsonLd"))}
      </script>
      <div className="min-h-screen w-full bg-white text-slate-950">
        <section className="relative overflow-hidden bg-white">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-[520px] bg-[linear-gradient(180deg,#fff7fb_0%,rgba(255,255,255,0)_74%)]" />
          <div className="container relative max-w-[1280px] py-12 sm:py-14 lg:py-16">
            <div className="mx-auto flex max-w-4xl flex-col items-center text-center">
              <h1 className="max-w-5xl px-2 text-[22px] font-extrabold leading-tight tracking-tight text-slate-950 sm:text-[26px] md:text-[32px] lg:whitespace-nowrap lg:text-[38px]">
                <span className="text-pink-500">{t("hero.titleAccent")}</span>{" "}
                {t("hero.titleSuffix")}
              </h1>
              <p className="mt-5 max-w-3xl px-2 text-[14px] font-normal leading-[1.62] text-[#666666]">
                {t("hero.description")}
              </p>
              <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-sm font-semibold text-slate-700">
                <span className="flex items-center gap-0.5 text-amber-400">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <Star
                      aria-hidden="true"
                      className="h-4 w-4 fill-current"
                      key={index}
                    />
                  ))}
                </span>
                <span>
                  {t("hero.rating.label", {
                    count: rating.count,
                    value: rating.value,
                  })}
                </span>
              </div>
            </div>

            <div className="mx-auto mt-7 grid max-w-[1080px] items-stretch gap-6 lg:mt-8 lg:grid-cols-[1.12fr_0.88fr] lg:gap-8">
              <div className="order-2 lg:order-1 lg:flex">
                <div className="relative mx-auto flex h-full w-full max-w-xl flex-col lg:max-w-none">
                  <div className="flex min-h-[340px] w-full items-center justify-center lg:min-h-[430px]">
                    <CompareSlider
                      after={sample.after}
                      afterAlt={t("compare.afterAlt", { title: sample.title })}
                      before={sample.before}
                      beforeAlt={t("compare.beforeAlt", { title: sample.title })}
                      className="aspect-square w-full max-w-[380px] overflow-visible lg:max-w-[430px]"
                      compareLabel={t("compare.ariaLabel")}
                      imageClassName="object-contain"
                      replayLabel={t("compare.replay")}
                      withReplay
                    />
                  </div>
                  <div className="relative mt-4 grid grid-cols-5 gap-2 lg:gap-2.5">
                    {heroSamples.map((item, index) => {
                      const active = index === activeSample;
                      const localizedItem = localizedHeroSamples[index];

                      return (
                        <button
                          aria-label={t("hero.showPreview", {
                            title: localizedItem.title,
                          })}
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
                          <span className="w-full truncate text-center">
                            {localizedItem.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="order-1 lg:order-2 lg:flex">
                <label className="text-card-foreground group relative flex w-full cursor-pointer items-center justify-center overflow-hidden rounded-[30px] border border-white bg-white px-7 py-9 shadow-[0_24px_68px_rgba(15,23,42,0.11)] ring-1 ring-slate-100/80 transition hover:-translate-y-0.5 hover:ring-pink-200 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-pink-500 sm:px-9 sm:py-11 lg:min-h-[430px] lg:py-12">
                  <input
                    accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp"
                    aria-label={t("upload.ariaLabel")}
                    className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
                    type="file"
                  />
                  <div className="w-full text-center">
                    <div className="mx-auto mb-6 grid h-14 w-14 place-items-center rounded-[20px] bg-pink-50 text-pink-500 shadow-[0_10px_22px_rgba(15,23,42,0.10)] transition group-hover:scale-105">
                      <CloudUpload className="h-8 w-8" />
                    </div>
                    <span className="pointer-events-none mx-auto inline-flex h-11 w-full max-w-[280px] items-center justify-center rounded-full bg-pink-500 px-4 py-2 text-[16px] font-semibold text-white shadow-[0_16px_32px_rgba(236,72,153,0.20)]">
                      <Upload className="mr-2.5 h-[18px] w-[18px]" />
                      {t("upload.button")}
                    </span>
                    <p className="mt-6 text-[18px] font-medium leading-tight text-slate-600">
                      {t("upload.drop")}
                    </p>
                    <p className="mt-2 text-[13px] font-medium leading-6 text-slate-500">
                      {t("upload.formats")}
                    </p>
                    <div className="mx-auto mt-6 h-px max-w-[320px] bg-slate-100" />
                    <div className="mt-4 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[12px] font-semibold tracking-normal text-slate-400">
                      <span className="inline-flex items-center gap-1.5">
                        <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
                        {t("upload.badges.secure")}
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <Zap className="h-3.5 w-3.5 shrink-0" />
                        {t("upload.badges.fast")}
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <Check className="h-3.5 w-3.5 shrink-0" />
                        {t("upload.badges.noSignUp")}
                      </span>
                    </div>
                  </div>
                </label>
              </div>
            </div>
          </div>
        </section>

        <section className="container max-w-[1280px] py-9">
          <div className="mx-auto mb-8 max-w-6xl text-center">
            <h2 className="text-balance text-[28px] font-extrabold tracking-normal text-slate-950 md:text-[34px] lg:whitespace-nowrap">
              {t("useCases.titlePrefix")}{" "}
              <span className="text-pink-500">
                {t("useCases.titleAccent")}
              </span>
            </h2>
            <p className="mt-3 text-slate-500">
              {t("useCases.description")}
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
            {localizedUseCases.map((item) => (
              <article
                className="flex min-w-0 flex-col items-center text-center"
                key={item.title}
              >
                <CompareSlider
                  after={item.after}
                  afterAlt={item.afterAlt}
                  before={item.before}
                  beforeAlt={item.beforeAlt}
                  className="h-[210px] w-full sm:h-[230px] lg:h-[200px]"
                  compareLabel={t("compare.ariaLabel")}
                />
                <h3 className="mt-5 text-base font-bold leading-tight text-slate-950 md:text-lg lg:text-base">
                  {item.title}
                </h3>
                <p className="mx-auto mt-2 max-w-[20rem] text-sm font-normal leading-6 text-slate-500 md:text-[14px] lg:text-sm">
                  {item.description}
                </p>
              </article>
            ))}
          </div>

          <div className="mt-6 rounded-lg border border-pink-100 bg-pink-50/70 p-6 text-card-foreground shadow-sm lg:p-8">
            <div className="grid gap-7 lg:grid-cols-[1fr_0.72fr] lg:items-center">
              <div>
                <div className="mb-5 inline-flex w-fit items-center gap-2 rounded-full border border-pink-200 bg-pink-50 px-2.5 py-0.5 text-xs font-semibold text-pink-600">
                  <WandSparkles className="h-3.5 w-3.5" />
                  {t("vectorInfo.eyebrow")}
                </div>
                <h3 className="max-w-3xl text-lg font-extrabold leading-tight text-slate-950">
                  {t("vectorInfo.title")}
                </h3>
                <p className="mt-4 max-w-4xl text-sm leading-7 text-slate-600">
                  {t("vectorInfo.description1")}
                </p>
                <p className="mt-4 max-w-4xl text-sm leading-7 text-slate-600">
                  {t("vectorInfo.description2")}
                </p>
              </div>
              <div className="rounded-lg border border-pink-100 bg-white p-5 shadow-sm">
                <div className="relative mx-auto grid aspect-square max-w-[230px] place-items-center overflow-hidden rounded-lg bg-white">
                  <div
                    className="absolute inset-0 opacity-60"
                    style={{
                      backgroundImage:
                        "linear-gradient(45deg,#f8fafc 25%,transparent 25%),linear-gradient(-45deg,#f8fafc 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#f8fafc 75%),linear-gradient(-45deg,transparent 75%,#f8fafc 75%)",
                      backgroundPosition: "0 0, 0 9px, 9px -9px, -9px 0",
                      backgroundSize: "18px 18px",
                    }}
                  />
                  <Sparkles className="relative z-10 h-24 w-24 text-pink-500 drop-shadow-[0_16px_26px_rgba(236,72,153,0.18)]" />
                </div>
                <p className="mt-3 text-center text-sm font-bold text-slate-800">
                  logo-set-01.svg
                </p>
                <p className="text-center text-xs text-slate-500">12 KB</p>
              </div>
            </div>
          </div>
        </section>

        <section className="container max-w-[1280px] py-12">
          <div className="mx-auto mb-8 max-w-2xl text-center">
            <h2 className="text-balance text-[28px] font-extrabold tracking-normal text-slate-950 md:text-[34px]">
              {t("conversion.titlePrefix")}{" "}
              <span className="text-pink-500">
                {t("conversion.titleAccent")}
              </span>
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-500">
              {t("conversion.description")}
            </p>
          </div>

          <div className="grid gap-6">
            <div className="grid gap-6 lg:grid-cols-[1fr_0.72fr]">
              {localizedConversionGroups.slice(0, 2).map((group, groupIndex) => (
                <div
                  className="rounded-xl border border-slate-100 bg-white/80 p-5 shadow-[0_18px_48px_rgba(15,23,42,0.05)]"
                  key={group.title}
                >
                  <div className="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-normal text-pink-500">
                    {groupIndex === 1 ? (
                      <Download className="h-3.5 w-3.5" />
                    ) : (
                      <FileImage className="h-3.5 w-3.5" />
                    )}
                    {group.eyebrow}
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <h3 className="text-base font-extrabold text-slate-950">
                        {group.title}
                      </h3>
                      <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
                        {group.description}
                      </p>
                    </div>
                  </div>
                  <div className={`mt-4 grid gap-4 ${group.columns}`}>
                    {group.items.map((item) => (
                      <a
                        className="group rounded-lg border border-slate-100 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-pink-100 hover:shadow-[0_18px_42px_rgba(236,72,153,0.10)]"
                        href={item.href}
                        key={item.title}
                      >
                        <FormatFlowIcon from={item.from} to={item.to} />
                        <h4 className="text-base font-bold text-slate-950">
                          {item.title}
                        </h4>
                        <p className="mt-2 min-h-10 text-sm leading-5 text-slate-500">
                          {item.description}
                        </p>
                        <span className="mt-4 inline-flex items-center text-xs font-bold text-pink-500">
                          {item.title}
                          <ArrowRight className="ml-1.5 h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
                        </span>
                      </a>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {localizedConversionGroups.slice(2).map((group) => (
              <div
                className="max-w-[720px] rounded-xl border border-slate-100 bg-white/80 p-5 shadow-[0_18px_48px_rgba(15,23,42,0.05)]"
                key={group.title}
              >
                <div className="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-normal text-pink-500">
                  <FileImage className="h-3.5 w-3.5" />
                  {group.eyebrow}
                </div>
                <h3 className="text-base font-extrabold text-slate-950">
                  {group.title}
                </h3>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  {group.description}
                </p>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  {group.items.map((item) => (
                    <a
                      className="group rounded-lg border border-slate-100 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-pink-100 hover:shadow-[0_18px_42px_rgba(236,72,153,0.10)]"
                      href={item.href}
                      key={item.title}
                    >
                      <FormatFlowIcon from={item.from} to={item.to} />
                      <h4 className="text-base font-bold text-slate-950">
                        {item.title}
                      </h4>
                      <p className="mt-2 min-h-10 text-sm leading-5 text-slate-500">
                        {item.description}
                      </p>
                      <span className="mt-4 inline-flex items-center text-xs font-bold text-pink-500">
                        {item.title}
                        <ArrowRight className="ml-1.5 h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
                      </span>
                    </a>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="container max-w-[1280px] py-14">
          <div className="mx-auto mb-10 max-w-3xl text-center">
            <p className="text-[12px] font-bold uppercase leading-none tracking-normal text-pink-500">
              {t("workflows.eyebrow")}
            </p>
            <h2 className="mt-5 text-balance text-[30px] font-extrabold leading-[1.08] tracking-normal text-slate-950 md:text-[36px]">
              {t("workflows.titleLine1")}
              <br />
              {t("workflows.titleLine2Prefix")}{" "}
              <span className="text-pink-500">
                {t("workflows.titleLine2Accent")}
              </span>
            </h2>
            <p className="mx-auto mt-5 max-w-2xl text-[15px] font-normal leading-7 text-slate-500 md:text-[16px]">
              {t("workflows.description")}
            </p>
          </div>
          <div className="relative left-1/2 grid w-[min(calc(100vw-2rem),1280px)] -translate-x-1/2 gap-[22px] md:grid-cols-3 lg:grid-cols-5">
            {localizedWorkflowCards.map((card) => {
              const Icon = card.icon;

              return (
                <div
                  className="flex h-[290px] flex-col items-center rounded-lg border border-slate-200 bg-white p-[18px] text-center shadow-[0_14px_34px_rgba(15,23,42,0.045)] transition hover:-translate-y-1 hover:border-pink-100 hover:shadow-[0_22px_52px_rgba(236,72,153,0.08)]"
                  key={card.title}
                >
                  <div
                    className={`grid h-[110px] w-full place-items-center rounded-lg ${card.iconClass}`}
                  >
                    <Icon className="h-12 w-12 stroke-[2.5]" />
                  </div>
                  <h3 className="mt-6 text-[17px] font-bold leading-tight text-slate-950">
                    {card.title}
                  </h3>
                  <p className="mt-4 max-w-[200px] text-[14px] font-normal leading-[1.55] text-slate-500">
                    {card.description}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        <section className="container max-w-[1280px] py-8">
          <div className="rounded-lg border border-pink-100 bg-pink-50/70 p-6 shadow-sm lg:p-8">
            <div className="grid gap-7 lg:grid-cols-[0.72fr_1fr] lg:items-center">
              <div>
                <div className="mb-5 inline-flex w-fit items-center gap-2 rounded-full border border-pink-200 bg-pink-50 px-2.5 py-0.5 text-xs font-semibold text-pink-600">
                  <WandSparkles className="h-3.5 w-3.5" />
                  {t("batch.eyebrow")}
                </div>
                <h2 className="text-lg font-extrabold leading-tight text-slate-950 md:text-xl">
                  {t("batch.titlePrefix")}{" "}
                  <span className="text-pink-500">
                    {t("batch.titleAccent")}
                  </span>
                </h2>
                <p className="mt-4 text-sm leading-7 text-slate-600">
                  {t("batch.description")}
                </p>
                <div className="mt-5 grid gap-2 text-sm font-medium text-slate-600">
                  {(t.raw("batch.features") as string[]).map((feature) => (
                    <span
                      className="inline-flex items-center gap-2"
                      key={feature}
                    >
                      <Check className="h-4 w-4 text-pink-500" />
                      {feature}
                    </span>
                  ))}
                </div>
              </div>

              <div className="rounded-lg border border-slate-100 bg-white p-5 shadow-sm">
                <div className="grid grid-cols-3 gap-4 text-center text-xs font-bold text-slate-400">
                  <span>{t("batch.preview.upload")}</span>
                  <span className="text-pink-500">
                    {t("batch.preview.adjust")}
                  </span>
                  <span>{t("batch.preview.convert")}</span>
                </div>
                <div className="mt-5 grid items-center gap-3 sm:grid-cols-[1fr_auto_1fr_auto_1fr]">
                  <div className="rounded-lg border border-slate-100 bg-slate-50 p-4 text-center">
                    <div className="mx-auto grid h-16 w-16 place-items-center rounded-md bg-white text-pink-500 shadow-sm">
                      <FileImage className="h-8 w-8" />
                    </div>
                    <p className="mt-3 text-xs font-bold text-slate-700">
                      logo-set-01.png
                    </p>
                    <p className="text-[11px] text-slate-400">482 KB</p>
                  </div>
                  <ArrowRight className="mx-auto hidden h-5 w-5 text-pink-400 sm:block" />
                  <div className="rounded-lg border border-pink-200 bg-pink-50 p-4 text-center shadow-[0_12px_28px_rgba(236,72,153,0.12)]">
                    <div className="mx-auto grid h-20 w-20 place-items-center rounded-full border-4 border-pink-200 bg-white text-lg font-extrabold text-pink-500">
                      8/10
                    </div>
                    <p className="mt-3 text-xs font-bold text-slate-700">
                      {t("batch.preview.converting")}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      {t("batch.preview.batchPreview")}
                    </p>
                  </div>
                  <ArrowRight className="mx-auto hidden h-5 w-5 text-pink-400 sm:block" />
                  <div className="rounded-lg border border-slate-100 bg-slate-50 p-4 text-center">
                    <div className="mx-auto grid h-16 w-16 place-items-center rounded-md bg-pink-500 text-white shadow-sm">
                      <Zap className="h-8 w-8" />
                    </div>
                    <p className="mt-3 text-xs font-bold text-slate-700">
                      logo-set-01.svg
                    </p>
                    <p className="text-[11px] text-slate-400">12 KB</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="container max-w-[1280px] py-9">
          <div className="mx-auto mb-8 max-w-2xl text-center">
            <h2 className="text-balance text-[28px] font-extrabold tracking-normal text-slate-950 md:text-[34px]">
              {t("steps.titlePrefix")}{" "}
              <span className="text-pink-500">{t("steps.titleAccent")}</span>
            </h2>
            <p className="mt-3 text-slate-500">
              {t("steps.description")}
            </p>
          </div>
          <div className="grid gap-5 lg:grid-cols-3">
            {localizedSteps.map((step, index) => {
              const Icon = step.icon;

              return (
                <div
                  className="relative rounded-lg border border-border bg-card p-6 text-card-foreground shadow-sm"
                  key={step.title}
                >
                  <span className="absolute left-4 top-4 grid h-8 w-8 place-items-center rounded-full bg-pink-500 text-sm font-bold text-white">
                    {index + 1}
                  </span>
                  <div className="mx-auto grid h-24 w-24 place-items-center rounded-full bg-pink-100 text-pink-500">
                    <Icon className="h-10 w-10" />
                  </div>
                  <h3 className="mt-5 text-center text-base font-extrabold text-slate-950">
                    {step.title}
                  </h3>
                  <p className="mt-2 text-center text-sm leading-6 text-slate-500">
                    {step.description}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        <section className="container max-w-[1280px] py-9">
          <div className="mx-auto mb-8 max-w-2xl text-center">
            <h2 className="text-balance text-[28px] font-extrabold tracking-normal text-slate-950 md:text-[34px]">
              {t("resources.title")}
            </h2>
            <p className="mt-3 text-slate-500">
              {t("resources.description")}
            </p>
          </div>
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {localizedResources.map((resource) => {
              const Icon = resource.icon;

              return (
                <article
                  className="overflow-hidden rounded-lg border border-border bg-card text-card-foreground shadow-sm transition hover:-translate-y-1"
                  key={resource.title}
                >
                  <div className="relative h-36 bg-slate-100">
                    <img
                      alt=""
                      className="h-full w-full object-cover"
                      src={asset(resource.image)}
                    />
                    <div className="absolute left-4 top-4 grid h-10 w-10 place-items-center rounded-md bg-white/90 text-pink-500 shadow-sm">
                      <Icon className="h-5 w-5" />
                    </div>
                  </div>
                  <div className="p-5">
                    <h3 className="text-base font-bold text-slate-950">
                      {resource.title}
                    </h3>
                    <p className="mt-2 min-h-16 text-sm leading-6 text-slate-500">
                      {resource.description}
                    </p>
                    <a
                      className="mt-3 inline-flex items-center text-sm font-bold text-pink-500"
                      href={resource.href}
                    >
                      {t("resources.readMore")}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </a>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <section className="container max-w-[1280px] py-8">
          <div className="rounded-lg border border-pink-100 bg-gradient-to-r from-pink-50 via-white to-pink-50 px-6 py-9 text-center text-card-foreground shadow-sm">
            <div className="mx-auto mb-5 inline-flex w-fit items-center gap-2 rounded-full border border-pink-200 bg-pink-50 px-2.5 py-0.5 text-xs font-semibold text-pink-600">
              <CloudUpload className="h-3.5 w-3.5" />
              {t("cta.eyebrow")}
            </div>
            <h2 className="text-[28px] font-extrabold text-slate-950 md:text-[34px]">
              {t("cta.title")}
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-[15px] leading-7 text-slate-600">
              {t("cta.description")}
            </p>
            <button className="mt-6 inline-flex h-10 items-center justify-center rounded-md bg-pink-500 px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-pink-600">
              <Upload className="mr-2 h-5 w-5" />
              {t("upload.button")}
            </button>
            <p className="mt-4 text-sm font-medium text-slate-500">
              {t("cta.note")}
            </p>
          </div>
        </section>

        <section className="container max-w-[1280px] py-9">
          <div className="mx-auto mb-8 max-w-2xl text-center">
            <h2 className="text-balance text-[28px] font-extrabold tracking-normal text-slate-950 md:text-[34px]">
              {t("faq.title")}
            </h2>
            <p className="mt-3 text-slate-500">
              {t("faq.description")}
            </p>
          </div>
          <div className="mx-auto max-w-3xl">
            <div className="divide-y divide-border rounded-lg border bg-card">
              {localizedFaqs.map((faq, index) => (
                <details
                  className="group px-5 py-4"
                  key={faq.question}
                  open={index === 0}
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-semibold text-foreground">
                    {faq.question}
                    <ArrowRight className="h-4 w-4 shrink-0 rotate-90 text-muted-foreground transition group-open:-rotate-90" />
                  </summary>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">
                    {faq.answer}
                  </p>
                </details>
              ))}
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
