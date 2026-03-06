import {
  Captions,
  Clapperboard,
  Crop,
  Images,
  SlidersHorizontal,
  Video,
} from "lucide-react";
import { useTranslations } from "next-intl";

const icons = [
  Captions,
  Images,
  Video,
  Clapperboard,
  Crop,
  SlidersHorizontal,
];

const colorTokens = [
  "from-sky-500 to-cyan-500",
  "from-violet-500 to-fuchsia-500",
  "from-emerald-500 to-teal-500",
  "from-amber-500 to-orange-500",
  "from-rose-500 to-pink-500",
  "from-indigo-500 to-blue-500",
];

export default function Seedance15Capabilities() {
  const t = useTranslations("Seedance15.Capabilities");
  const items =
    (t.raw("items") as { title: string; description: string }[]) || [];

  return (
    <section id="capabilities" className="relative overflow-hidden py-16 lg:py-20">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="animate-in fade-in slide-in-from-bottom-6 text-3xl font-bold text-slate-900 [text-shadow:0_0_22px_rgba(56,189,248,0.35)] duration-700 dark:text-white md:text-4xl">
            {t("title")}
          </h2>
          <p className="animate-in fade-in slide-in-from-bottom-8 mt-4 text-slate-600 duration-700 dark:text-slate-300">
            {t("description")}
          </p>
        </div>

        <div className="mx-auto mt-10 grid max-w-7xl gap-5 md:grid-cols-2 lg:grid-cols-3">
          {items.map((item, index) => {
            const Icon = icons[index] || Captions;

            return (
              <article
                key={item.title}
                className="group animate-in fade-in slide-in-from-bottom-10 rounded-2xl border border-slate-600/80 bg-slate-900/82 p-6 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04),0_0_18px_rgba(99,102,241,0.15)] transition duration-500 hover:-translate-y-1 hover:border-cyan-300/70 hover:shadow-[0_0_44px_rgba(59,130,246,0.5)]"
                style={{ animationDelay: `${index * 100 + 100}ms` }}
              >
                <div
                  className={`inline-flex rounded-xl bg-gradient-to-br ${colorTokens[index] || colorTokens[0]} p-3 text-white shadow-[0_0_34px_rgba(99,102,241,0.6)] transition duration-300 group-hover:scale-105`}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-white">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-300">
                  {item.description}
                </p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
