

import { useTranslations } from "next-intl";
import Link from "next/link";
import { Fragment } from "react";

const HowItWorks = () => {
  const t = useTranslations("Landing.HowItWorks");
  const items = (t.raw("items") as any[]) || [];

  return (
    <section className="bg-black py-20 relative overflow-hidden">
      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center mb-20">
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-4">
            <span className="text-white">{t("titlePrefix")}</span>
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-cyan-600">{t("titleSuffix")}</span>
          </h2>
        </div>

        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col lg:flex-row items-center justify-center gap-8 lg:gap-0">
            {items.map((item, index) => (
              <Fragment key={index}>
                <div className="flex-1 max-w-sm">
                  <div className="flex justify-center mb-8">
                    <div className="relative">
                      <div className="w-20 h-20 rounded-full border-2 border-white/30 flex items-center justify-center">
                        <span className="text-3xl font-bold text-white">{index + 1}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-center">
                    <h3 className="text-2xl font-bold text-white mb-4">{item.title}</h3>
                    <p className="text-gray-400 leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                </div>

                {index < items.length - 1 && (
                  <div className="hidden lg:block flex-shrink-0 mx-4">
                    <svg width="150" height="60" viewBox="0 0 150 60" fill="none" className="text-blue-500">
                      <path d="M 0,30 Q 37.5,15 75,30 T 150,30" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none"></path>
                      <path d="M 142,22 L 150,30 L 142,38" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"></path>
                    </svg>
                  </div>
                )}
              </Fragment>
            ))}
          </div>
        </div>

        <div className="text-center mt-16">
          <Link href="/seedance2" className="px-8 py-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold rounded-full hover:shadow-xl hover:shadow-purple-500/50 transition-all duration-300 hover:scale-105 cursor-pointer inline-block">
            {t("button")}
          </Link>
        </div>
      </div>
    </section>
  )
}

export default HowItWorks;
