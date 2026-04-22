import { Megaphone, PlaySquare, Theater, WandSparkles } from "lucide-react";
import { useTranslations } from "next-intl";

const icons = [Theater, Megaphone, PlaySquare, WandSparkles];
const gradients = [
  "from-violet-600 to-indigo-600",
  "from-orange-500 to-rose-500",
  "from-cyan-500 to-blue-500",
  "from-emerald-500 to-teal-500",
];

export default function Seedance15UseCases() {
  const t = useTranslations("Seedance15.UseCases");
  const items = (t.raw("items") as { title: string; description: string }[]) || [];

  return (
    <section className="relative overflow-hidden py-16 lg:py-20">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="animate-in fade-in slide-in-from-bottom-6 text-3xl font-bold text-slate-900 [text-shadow:0_0_22px_rgba(217,70,239,0.35)] duration-700 dark:text-white md:text-4xl">
            {t("title")}
          </h2>
          <p className="animate-in fade-in slide-in-from-bottom-8 mt-4 text-slate-600 duration-700 dark:text-slate-300">
            {t("description")}
          </p>
        </div>

        <div className="mx-auto mt-10 grid max-w-7xl gap-5 md:grid-cols-2">
          {items.map((item, index) => {
            const Icon = icons[index] || Theater;

            return (
              <article
                key={item.title}
                className="group animate-in fade-in slide-in-from-bottom-10 rounded-2xl border border-slate-600/80 bg-slate-900/82 p-6 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04),0_0_18px_rgba(217,70,239,0.14)] transition duration-500 hover:-translate-y-1 hover:border-fuchsia-300/75 hover:shadow-[0_0_42px_rgba(217,70,239,0.52)]"
                style={{ animationDelay: `${index * 120 + 100}ms` }}
              >
                <div
                  className={`inline-flex rounded-xl bg-gradient-to-r ${gradients[index] || gradients[0]} p-3 text-white shadow-[0_0_32px_rgba(59,130,246,0.55)] transition duration-300 group-hover:scale-105`}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-xl font-semibold text-white">
                  {item.title}
                </h3>
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
