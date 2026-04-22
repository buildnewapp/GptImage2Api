import { AudioLines, Languages, TimerReset } from "lucide-react";
import { useTranslations } from "next-intl";

const cardStyles = [
  "from-cyan-600 to-blue-500",
  "from-fuchsia-600 to-violet-500",
  "from-amber-500 to-orange-500",
];

const icons = [AudioLines, Languages, TimerReset];

export default function Seedance15Overview() {
  const t = useTranslations("Seedance15.Overview");
  const items =
    (t.raw("items") as { title: string; description: string }[]) || [];

  return (
    <section className="relative overflow-hidden py-16 text-slate-900 dark:text-white lg:py-20">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="animate-in fade-in slide-in-from-bottom-6 text-3xl font-bold text-slate-900 [text-shadow:0_0_20px_rgba(34,211,238,0.35)] duration-700 dark:text-white md:text-4xl">
            {t("title")}
          </h2>
          <p className="animate-in fade-in slide-in-from-bottom-8 mt-4 text-slate-600 duration-700 dark:text-slate-300">
            {t("description")}
          </p>
        </div>

        <div className="mx-auto mt-10 grid max-w-7xl gap-5 md:grid-cols-3">
          {items.map((item, index) => {
            const Icon = icons[index] || AudioLines;

            return (
              <article
                key={item.title}
                className="group animate-in fade-in slide-in-from-bottom-10 rounded-2xl border border-cyan-300/35 bg-slate-900/78 p-6 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.05),0_0_18px_rgba(34,211,238,0.12)] transition duration-500 hover:-translate-y-1 hover:border-cyan-300/70 hover:shadow-[0_0_36px_rgba(34,211,238,0.46)]"
                style={{ animationDelay: `${index * 120 + 120}ms` }}
              >
                <div
                  className={`inline-flex rounded-xl bg-gradient-to-br ${cardStyles[index] || cardStyles[0]} p-3 text-white shadow-[0_0_28px_rgba(59,130,246,0.55)]`}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-xl font-semibold text-white">{item.title}</h3>
                <p className="mt-2 leading-relaxed text-slate-300">
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
