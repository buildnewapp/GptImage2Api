

import { Activity, Aperture, ArrowRight, Camera, Files, Film, Heart, Mic, Palette, Scissors, UserCheck, Zap } from "lucide-react";
import { useTranslations } from "next-intl";

const Features = () => {
  const t = useTranslations("Landing.Features");

  const staticFeatures = [
    {
      icon: <Zap className="w-7 h-7 text-white" />,
      gradient: "from-amber-500 to-orange-600",
      bgGradient: "from-amber-400 to-orange-500"
    },
    {
      icon: <Files className="w-7 h-7 text-white" />,
      gradient: "from-blue-500 to-cyan-600",
      bgGradient: "from-blue-400 to-cyan-500"
    },
    {
      icon: <UserCheck className="w-7 h-7 text-white" />,
      gradient: "from-emerald-500 to-teal-600",
      bgGradient: "from-emerald-400 to-teal-500"
    },
    {
      icon: <Camera className="w-7 h-7 text-white" />,
      gradient: "from-violet-500 to-purple-600",
      bgGradient: "from-violet-400 to-purple-500"
    },
    {
      icon: <Palette className="w-7 h-7 text-white" />,
      gradient: "from-rose-500 to-pink-600",
      bgGradient: "from-rose-400 to-pink-500"
    },
    {
      icon: <Film className="w-7 h-7 text-white" />,
      gradient: "from-indigo-500 to-blue-600",
      bgGradient: "from-indigo-400 to-blue-500"
    },
    {
      icon: <ArrowRight className="w-7 h-7 text-white" />,
      gradient: "from-cyan-500 to-blue-600",
      bgGradient: "from-cyan-400 to-blue-500"
    },
    {
      icon: <Mic className="w-7 h-7 text-white" />,
      gradient: "from-fuchsia-500 to-purple-600",
      bgGradient: "from-fuchsia-400 to-purple-500"
    },
    {
      icon: <Aperture className="w-7 h-7 text-white" />,
      gradient: "from-red-500 to-orange-600",
      bgGradient: "from-red-400 to-orange-500"
    },
    {
      icon: <Scissors className="w-7 h-7 text-white" />,
      gradient: "from-slate-500 to-gray-600",
      bgGradient: "from-slate-400 to-gray-500"
    },
    {
      icon: <Activity className="w-7 h-7 text-white" />,
      gradient: "from-lime-500 to-green-600",
      bgGradient: "from-lime-400 to-green-500"
    },
    {
      icon: <Heart className="w-7 h-7 text-white" />,
      gradient: "from-pink-500 to-rose-600",
      bgGradient: "from-pink-400 to-rose-500"
    }
  ];

  const featuresData = (t.raw("items") as any[]) || [];
  const features = featuresData.map((item, index) => ({
    ...item,
    ...(staticFeatures[index] || staticFeatures[0])
  }));

  return (
      <section id="features" className="relative py-20 lg:py-28 overflow-hidden bg-gradient-to-b from-slate-50 to-white dark:from-slate-950 dark:to-slate-900">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 -left-20 w-72 h-72 bg-purple-400/20 dark:bg-purple-600/10 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-1/4 -right-20 w-72 h-72 bg-blue-400/20 dark:bg-blue-600/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-cyan-400/10 dark:bg-cyan-600/5 rounded-full blur-3xl"></div>
        </div>

        <div className="container px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center mb-16 lg:mb-20">
            <h2 className="text-3xl md:text-4xl font-extrabold mb-6 leading-tight">
              <span className="text-gray-900 dark:text-white">{t("titlePrefix")}</span>
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-cyan-600">{t("titleSuffix")}</span>
            </h2>
            <p className="text-lg lg:text-xl text-gray-600 dark:text-slate-400 max-w-3xl mx-auto leading-relaxed">
              {t("description")}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
            {features.map((feature, index) => (
                <div key={index} className="group relative">
                  <div className="relative h-full bg-white dark:bg-slate-900/50 backdrop-blur-sm rounded-3xl p-8 shadow-xl hover:shadow-2xl transition-all duration-500 border border-gray-200 dark:border-slate-800 hover:border-transparent overflow-hidden hover:-translate-y-2">
                    <div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-500`}></div>
                    <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-10 blur-2xl transition-all duration-500 rounded-full`}></div>

                    <div className="relative mb-6">
                      <div className={`inline-flex p-4 rounded-2xl bg-gradient-to-br ${feature.bgGradient} shadow-lg group-hover:scale-110 transition-transform duration-500`}>
                        {feature.icon}
                      </div>
                      <div className={`absolute inset-0 bg-gradient-to-br ${feature.bgGradient} opacity-0 group-hover:opacity-40 blur-xl transition-opacity duration-500 rounded-2xl`}></div>
                    </div>

                    <div className="relative">
                      <h3 className={`text-xl lg:text-2xl font-bold text-gray-900 dark:text-white mb-4 group-hover:bg-clip-text group-hover:text-transparent group-hover:bg-gradient-to-r ${feature.gradient} transition-all duration-500`}>
                        {feature.title}
                      </h3>
                      <p className="text-gray-600 dark:text-slate-400 leading-relaxed text-sm lg:text-base">
                        {feature.description}
                      </p>
                    </div>
                    <div className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r ${feature.gradient} transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left`}></div>
                  </div>
                </div>
            ))}
          </div>
        </div>
      </section>
  )
}

export default Features;
