"use client";

import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import Image from "next/image";



const Testimonials = () => {
  const t = useTranslations("Landing.Testimonials");
  const items = (t.raw("items") as any[]) || [];

  const images = [
    "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop",
    "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop",
    "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=400&fit=crop",
    "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=400&fit=crop",
    "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=400&fit=crop",
    "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&h=400&fit=crop",
    "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=400&h=400&fit=crop",
    "https://images.unsplash.com/photo-1519345182560-3f2917c472ef?w=400&h=400&fit=crop",
    "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&h=400&fit=crop",
  ];

  const testimonials = items.map((item, index) => ({
    ...item,
    image: images[index % images.length]
  }));

  return (
    <section className="bg-gradient-to-b from-white to-slate-50 dark:from-slate-950 dark:to-slate-900 py-20 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-20 w-96 h-96 bg-purple-400/10 dark:bg-purple-600/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-blue-400/10 dark:bg-blue-600/5 rounded-full blur-3xl"></div>
      </div>
      <div className="container z-10 mx-auto relative">
        <div className="flex flex-col items-center justify-center mx-auto px-4 mb-16">
          <div className="flex justify-center">
            <div className="inline-flex items-center gap-2 border py-2 px-5 rounded-full bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border-purple-200 dark:border-purple-800">
              <span className="text-sm font-semibold text-gray-900 dark:text-white">{t("badge.label")}</span>
            </div>
          </div>
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mt-6 text-center">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-600">
              {t("title")}
            </span>
          </h2>
          <p className="text-center mt-6 text-lg opacity-75 text-gray-600 dark:text-slate-400 leading-relaxed max-w-2xl">
            {t("description")}
          </p>
        </div>

        <div className="relative h-[600px] overflow-hidden mask-image-gradient">
          {/* Gradient Masks */}
          <div className="absolute top-0 left-0 right-0 h-20 bg-gradient-to-b from-white dark:from-slate-950 to-transparent z-10"></div>
          <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-white dark:from-slate-950 to-transparent z-10"></div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 h-full">
            {[0, 1, 2].map((colIndex) => (
              <div key={colIndex} className="relative h-full overflow-hidden">
                <motion.div
                  className="flex flex-col gap-6 pb-6"
                  animate={{
                    y: ["0%", "-50%"],
                  }}
                  transition={{
                    duration: 20 + colIndex * 5, // Staggered speeds
                    repeat: Infinity,
                    ease: "linear",
                  }}
                >
                  {/* Duplicate items for seamless loop */}
                  {[...testimonials, ...testimonials].filter((_, i) => i % 3 === colIndex).map((testimonial, i) => (
                    <div
                      key={i}
                      className="p-8 rounded-3xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-slate-900 shadow-lg shadow-purple-500/5"
                    >
                      <div className="text-gray-600 dark:text-gray-300 leading-relaxed mb-6">
                        "{testimonial.quote}"
                      </div>
                      <div className="flex items-center gap-3">
                        <Image
                          width={40}
                          height={40}
                          src={testimonial.image}
                          alt={testimonial.name}
                          className="h-10 w-10 rounded-full object-cover ring-2 ring-purple-100 dark:ring-purple-900"
                        />
                        <div className="flex flex-col">
                          <div className="font-semibold text-gray-900 dark:text-white text-sm">
                            {testimonial.name}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {testimonial.role}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </motion.div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
