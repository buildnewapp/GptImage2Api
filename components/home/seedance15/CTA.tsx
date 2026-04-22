import { Link as I18nLink } from "@/i18n/routing";
import Link from "next/link";
import { useTranslations } from "next-intl";

export default function Seedance15CTA() {
  const t = useTranslations("Seedance15.CTA");

  return (
    <section className="relative overflow-hidden py-16 text-slate-900 dark:text-white">
      <div className="container relative z-10 mx-auto px-4 text-center">
        <h2 className="animate-in fade-in slide-in-from-bottom-6 text-3xl font-black text-slate-900 [text-shadow:0_0_24px_rgba(255,255,255,0.35)] duration-700 dark:text-white md:text-4xl">
          {t("title")}
        </h2>
        <p className="animate-in fade-in slide-in-from-bottom-8 mx-auto mt-4 max-w-2xl text-slate-700 duration-700 dark:text-cyan-50">
          {t("description")}
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="#create"
            className="rounded-xl border border-cyan-100/90 bg-gradient-to-r from-cyan-200 via-sky-300 to-blue-400 px-6 py-3 text-sm font-semibold text-slate-950 shadow-[0_0_42px_rgba(34,211,238,0.72)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_0_60px_rgba(34,211,238,0.95)]"
          >
            {t("primary")}
          </Link>
          <I18nLink
            href="/#pricing"
            className="rounded-xl border border-fuchsia-300/80 bg-fuchsia-200/70 px-6 py-3 text-sm font-semibold text-fuchsia-950 shadow-[0_0_38px_rgba(217,70,239,0.3)] transition duration-300 hover:-translate-y-0.5 hover:bg-fuchsia-200/90 dark:border-fuchsia-100/90 dark:bg-fuchsia-300/25 dark:text-white dark:shadow-[0_0_38px_rgba(217,70,239,0.58)] dark:hover:bg-fuchsia-300/35 dark:hover:shadow-[0_0_56px_rgba(217,70,239,0.9)]"
          >
            {t("secondary")}
          </I18nLink>
        </div>
      </div>
    </section>
  );
}
