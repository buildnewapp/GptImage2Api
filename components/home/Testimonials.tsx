import FeatureBadge from "@/components/shared/FeatureBadge";
import { GlowingEffect } from "@/components/ui/glowing-effect";
import { Star, StarHalf } from "lucide-react";
import { useTranslations } from "next-intl";

type Testimonial = {
  content: string;
  author: {
    name: string;
    position: string;
    avatar: string;
  };
  rating: number;
};

const testimonials: Testimonial[] = [
  {
    content:
      "SdanceAI helped us launch our AI content generator in just 1 day. Authentication, payment integration, and video generation capabilities were all available in one workflow.",
    author: {
      name: "Michael Chen",
      position: "Indie Maker",
      avatar: "/images/users/user1.jpeg",
    },
    rating: 5.0,
  },
  {
    content:
      "As a product manager with limited technical resources, SdanceAI was a game-changer. We launched our first subscription workflow in 3 days instead of several weeks.",
    author: {
      name: "Sarah Johnson",
      position: "CTO",
      avatar: "/images/users/user2.jpeg",
    },
    rating: 4.8,
  },
  {
    content:
      "我们团队基于 SdanceAI 搭建了订阅制 AI 视频工具，首个版本仅用 1 天完成。多语言与支付流程都非常顺畅，项目推进速度明显提升。",
    author: {
      name: "Kang",
      position: "Product Manager",
      avatar: "/images/users/user3.png",
    },
    rating: 5.0,
  },
];

const RatingStars = ({ rating }: { rating: number }) => {
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 !== 0;

  return (
    <div className="flex items-center">
      <div className="text-yellow-400 flex">
        {[...Array(fullStars)].map((_, i) => (
          <Star key={i} className="fill-current h-5 w-5" />
        ))}
        {hasHalfStar && <StarHalf className="fill-current h-5 w-5" />}
      </div>
      <span className="ml-2 text-muted-foreground">{rating.toFixed(1)}</span>
    </div>
  );
};

export default function Testimonials() {
  const t = useTranslations("Landing.Testimonials");

  return (
    <section id="testimonials" className="py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <FeatureBadge label={t("badge.label")} className="mb-8" />
          <h2 className="text-center z-10 text-lg md:text-5xl font-sans font-semibold mb-4">
            <span className="title-gradient">{t("title")}</span>
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
            {t("description")}
          </p>
        </div>

        <ul className="grid grid-cols-1 gap-6 md:grid-cols-3 lg:gap-8">
          {testimonials.map((testimonial) => (
            <li key={testimonial.content} className="min-h-64 list-none">
              <div className="relative h-full rounded-[1.25rem] border-[0.75px] border-border p-2 md:rounded-3xl md:p-3">
                <GlowingEffect
                  spread={40}
                  glow={true}
                  disabled={false}
                  proximity={64}
                  inactiveZone={0.01}
                  borderWidth={3}
                />
                <div className="relative flex h-full flex-col justify-between gap-6 overflow-hidden rounded-xl border-[0.75px] bg-background p-6 shadow-xs dark:shadow-[0px_0px_27px_0px_rgba(45,45,45,0.3)] md:p-6">
                  <div className="relative flex flex-1 flex-col justify-between gap-3">
                    <RatingStars rating={testimonial.rating} />
                    <p className="text-foreground">{testimonial.content}</p>
                    <div className="flex items-center">
                      <div className="w-12 h-12 rounded-full flex items-center justify-center">
                        <img
                          src={testimonial.author.avatar}
                          alt={testimonial.author.name}
                          width={48}
                          height={48}
                          className="rounded-full"
                        />
                      </div>
                      <div className="ml-3">
                        <p className="font-medium">
                          {testimonial.author.name},{" "}
                          <span className="">
                            {testimonial.author.position}
                          </span>
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
