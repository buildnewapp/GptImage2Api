

import { Layers, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";

const UseCases = () => {
  const t = useTranslations("Landing.UseCases");

  const staticCases = [
    {
      icon: <div className="flex"><Layers className="w-6 h-6 text-white" /></div>,
      gradient: "from-orange-500 to-red-500",
      hoverText: "from-purple-600 to-blue-600"
    },
    {
      icon: <div className="flex"><Layers className="w-6 h-6 text-white" /></div>,
      gradient: "from-blue-500 to-cyan-500",
      hoverText: "from-purple-600 to-blue-600"
    },
    {
      icon: <div className="flex"><Layers className="w-6 h-6 text-white" /></div>,
      gradient: "from-purple-500 to-pink-500",
      hoverText: "from-purple-600 to-blue-600"
    },
    {
      icon: <div className="flex"><Layers className="w-6 h-6 text-white" /></div>,
      gradient: "from-green-500 to-emerald-500",
      hoverText: "from-purple-600 to-blue-600"
    },
    {
      icon: <div className="flex"><Layers className="w-6 h-6 text-white" /></div>,
      gradient: "from-violet-500 to-purple-500",
      hoverText: "from-purple-600 to-blue-600"
    },
    {
      icon: <div className="flex"><Layers className="w-6 h-6 text-white" /></div>,
      gradient: "from-amber-500 to-orange-500",
      hoverText: "from-purple-600 to-blue-600"
    },
    {
      icon: <div className="flex"><Layers className="w-6 h-6 text-white" /></div>,
      gradient: "from-indigo-500 to-blue-500",
      hoverText: "from-purple-600 to-blue-600"
    },
    {
      icon: <div className="flex"><Layers className="w-6 h-6 text-white" /></div>,
      gradient: "from-teal-500 to-cyan-500",
      hoverText: "from-purple-600 to-blue-600"
    },
    {
      icon: <div className="flex"><Layers className="w-6 h-6 text-white" /></div>,
      gradient: "from-rose-500 to-pink-500",
      hoverText: "from-purple-600 to-blue-600"
    }
  ];

  const casesData = (t.raw("items") as any[]) || [];
  const cases = casesData.map((item, index) => ({
    ...item,
    ...(staticCases[index] || staticCases[0])
  }));

  return (
    <section className="bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-950 py-20 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-40 w-96 h-96 bg-purple-400/10 dark:bg-purple-600/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 -right-40 w-96 h-96 bg-blue-400/10 dark:bg-blue-600/5 rounded-full blur-3xl"></div>
      </div>
      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 border py-2 px-5 rounded-full bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border-purple-200 dark:border-purple-800 mb-6">
            <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            <span className="text-sm font-semibold text-gray-900 dark:text-white">{t("badge")}</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight">
            <span className="text-gray-900 dark:text-white">{t("titlePrefix")}</span>
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-cyan-600">{t("titleSuffix")}</span>
          </h2>
          <p className="mt-6 text-lg text-gray-600 dark:text-slate-400 max-w-3xl mx-auto leading-relaxed">
            {t("description")}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8 max-w-7xl mx-auto">
          {cases.map((useCase, index) => (
            <div key={index} className="group relative bg-white dark:bg-slate-800 rounded-2xl p-6 sm:p-8 shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2">
              <div className="flex items-center gap-3 mb-3">
                <div className="relative">
                  <div className={`absolute inset-0 bg-gradient-to-br ${useCase.gradient} rounded-2xl blur-xl opacity-20 group-hover:opacity-30 transition-opacity duration-300`}></div>
                  <div className={`relative w-12 h-12 rounded-xl bg-gradient-to-br ${useCase.gradient} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                    {useCase.icon}
                  </div>
                </div>
                <h3 className={`text-xl sm:text-2xl font-bold text-gray-900 dark:text-white group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r ${useCase.hoverText} transition-all duration-300`}>
                  {useCase.title}
                </h3>
              </div>
              <p className="text-gray-600 dark:text-slate-400 leading-relaxed mb-6">
                {useCase.description}
              </p>
              <div className="flex flex-wrap gap-2">
                {useCase.tags.map((tag: string, i: number) => (
                  <span key={i} className="px-3 py-1 text-xs sm:text-sm font-medium bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300 rounded-full hover:bg-gradient-to-r hover:from-purple-100 hover:to-blue-100 dark:hover:from-purple-900/30 dark:hover:to-blue-900/30 transition-colors duration-300">
                    {tag}
                  </span>
                ))}
              </div>
              <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${useCase.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-300 pointer-events-none`}></div>
            </div>
          ))}
        </div>

        <div className="text-center mt-16">
          <p className="text-gray-600 dark:text-slate-400 mb-6 text-lg">Ready to explore your use case?</p>
          <Link href="/seedance2" className="px-8 py-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold rounded-full hover:shadow-xl hover:shadow-purple-500/50 transition-all duration-300 hover:scale-105 cursor-pointer inline-block">
            {t("button")}
          </Link>
        </div>
      </div>
    </section>
  )
}

export default UseCases;
