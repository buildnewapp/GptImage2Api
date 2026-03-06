import { ArrowDownRight, Sparkles } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";

export default function Seedance15Hero() {
  const t = useTranslations("Seedance15.Hero");

  return (
    <section className="relative overflow-hidden py-20 text-slate-900 dark:text-white lg:py-28">
      <div className="container relative z-10 mx-auto px-4">
        <div className="mx-auto max-w-7xl">
          <div className="animate-in fade-in slide-in-from-top-4 inline-flex items-center gap-2 rounded-full border border-cyan-300/80 bg-cyan-200/70 px-4 py-2 text-sm font-medium text-cyan-900 shadow-[0_0_34px_rgba(34,211,238,0.24)] duration-700 dark:border-cyan-300/70 dark:bg-cyan-400/20 dark:text-cyan-100 dark:shadow-[0_0_34px_rgba(34,211,238,0.38)]">
            <Sparkles className="h-4 w-4 text-cyan-300" />
            {t("badge")}
          </div>

          <h1 className="animate-in fade-in slide-in-from-bottom-6 mt-8 text-4xl font-black leading-tight [text-shadow:0_0_20px_rgba(56,189,248,0.35)] duration-700 md:text-5xl lg:text-6xl">
            {t("titlePrefix")}
            <span className="bg-gradient-to-r from-cyan-300 via-fuchsia-300 to-blue-300 bg-clip-text text-transparent [text-shadow:0_0_26px_rgba(217,70,239,0.4)]">
              {" "}
              {t("titleHighlight")}
            </span>
          </h1>

          <p className="animate-in fade-in slide-in-from-bottom-8 mt-6 max-w-3xl text-lg leading-relaxed text-slate-700 duration-700 dark:text-slate-200">
            {t("description")}
          </p>
          <p className="animate-in fade-in slide-in-from-bottom-8 mt-3 max-w-4xl text-sm leading-relaxed text-cyan-800/90 duration-700 dark:text-cyan-100/95">
            {t("wrapperDisclosure")}
          </p>
          <p className="animate-in fade-in slide-in-from-bottom-8 mt-2 max-w-4xl text-xs leading-relaxed text-slate-600 duration-700 dark:text-slate-300">
            {t("disclaimer")}
          </p>

          <div className="animate-in fade-in slide-in-from-bottom-8 mt-8 flex flex-wrap gap-3 duration-700">
            <Link
              href="#create"
              className="inline-flex items-center gap-2 rounded-xl border border-cyan-100/80 bg-gradient-to-r from-cyan-300 via-sky-300 to-blue-400 px-5 py-3 text-sm font-semibold text-slate-950 shadow-[0_0_34px_rgba(34,211,238,0.65)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_0_48px_rgba(34,211,238,0.9)]"
            >
              {t("primaryCta")}
              <ArrowDownRight className="h-4 w-4" />
            </Link>
            <Link
              href="#capabilities"
              className="inline-flex items-center gap-2 rounded-xl border border-fuchsia-300/70 bg-fuchsia-200/70 px-5 py-3 text-sm font-semibold text-fuchsia-900 shadow-[0_0_30px_rgba(217,70,239,0.24)] transition duration-300 hover:-translate-y-0.5 hover:bg-fuchsia-200/90 dark:border-fuchsia-300/65 dark:bg-fuchsia-400/20 dark:text-fuchsia-50 dark:shadow-[0_0_30px_rgba(217,70,239,0.42)] dark:hover:bg-fuchsia-400/30 dark:hover:shadow-[0_0_44px_rgba(217,70,239,0.7)]"
            >
              {t("secondaryCta")}
            </Link>
          </div>

        </div>
      </div>
    </section>
  );
}
