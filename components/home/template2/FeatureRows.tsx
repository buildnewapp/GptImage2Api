import { featureTitleClass } from "@/components/home/template2/constants";
import type { HomeTemplate2FeatureRow } from "@/components/home/template2/types";

interface FeatureRowsProps {
  items: HomeTemplate2FeatureRow[];
}

export default function FeatureRows({ items }: FeatureRowsProps) {
  return (
    <>
      {items.map((item, index) => {
        const sectionClassName =
          index % 2 === 0 ? "py-16 sm:py-24 bg-transparent" : "py-16 sm:py-24 bg-muted/20";

        return (
          <section key={item.title} className={sectionClassName}>
            <div className="container mx-auto px-4">
              <div
                className={`grid items-center gap-12 lg:grid-cols-2 lg:gap-16 ${
                  item.reverse ? "lg:flex-row-reverse" : ""
                }`}
              >
                {item.reverse ? (
                  <>
                    <FeaturePreview videoSrc={item.videoSrc} />
                    <FeatureCopy title={item.title} description={item.description} />
                  </>
                ) : (
                  <>
                    <FeatureCopy title={item.title} description={item.description} />
                    <FeaturePreview videoSrc={item.videoSrc} />
                  </>
                )}
              </div>
            </div>
          </section>
        );
      })}
    </>
  );
}

function FeatureCopy({
  title,
  description,
}: {
  description: string;
  title: string;
}) {
  return (
    <div data-aos="fade-right" className="flex max-w-xl flex-col justify-center space-y-4">
      <h2 className={featureTitleClass}>{title}</h2>
      <p className="text-lg leading-relaxed text-muted-foreground">{description}</p>
    </div>
  );
}

function FeaturePreview({ videoSrc }: { videoSrc: string }) {
  return (
    <div data-aos="fade-left" className="flex items-center justify-center">
      <div className="relative aspect-video overflow-hidden rounded-[2rem] border border-border/70 shadow-[0_30px_60px_-42px_rgba(15,23,42,0.56)]">
        <video
          src={videoSrc}
          autoPlay
          muted
          playsInline
          loop
          preload="metadata"
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 transition-opacity duration-300 hover:opacity-100"></div>
      </div>
    </div>
  );
}
