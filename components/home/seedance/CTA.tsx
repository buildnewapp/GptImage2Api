
import { ArrowRight, Check } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";

const CTA = () => {
  const t = useTranslations("Landing.CTA");

  return (
    <section className="py-20 relative overflow-hidden bg-gradient-to-br from-purple-600 via-blue-600 to-cyan-600">
      {/* Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-purple-600/20 rounded-full blur-[100px] pointer-events-none"></div>

      <div className="container mx-auto px-4 relative z-10 text-center">
        <h2 className="text-4xl sm:text-5xl font-extrabold text-white mb-6 leading-tight">
          {t("title")}
        </h2>
        <p className="text-lg sm:text-xl text-white/90 mb-12 max-w-2xl mx-auto leading-relaxed">
          {t("description")}
        </p>
        <div className="flex justify-center mb-12">
          <Link
            href="/seedance2"
            className="group px-10 py-5 bg-white text-purple-600 font-bold rounded-full hover:bg-gray-50 transition-all duration-300 hover:scale-105 shadow-2xl hover:shadow-white/50 flex items-center gap-2 text-lg"
          >
            {t("button")}
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" />
          </Link>
        </div>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-6 text-white/80 text-sm">
          <div className="flex items-center gap-2">
            <Check className="w-5 h-5 text-green-400" />
            <span>{t("features.multimodal")}</span>
          </div>
          <div className="hidden sm:block w-px h-4 bg-white/30"></div>
          <div className="flex items-center gap-2">
            <Check className="w-5 h-5 text-green-400" />
            <span>{t("features.watermark")}</span>
          </div>
          <div className="hidden sm:block w-px h-4 bg-white/30"></div>
          <div className="flex items-center gap-2">
            <Check className="w-5 h-5 text-green-400" />
            <span>{t("features.reference")}</span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CTA;
