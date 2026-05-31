import { featureTitleClass } from "@/components/home/video/constants";
import FeatureHoverVideo from "@/components/home/video/FeatureHoverVideo";
import { LazyPreviewVideo } from "@/components/home/video/Media";
import type { VideoTemplateFeatureRow } from "@/components/home/video/types";

interface FeatureRowsProps {
  items: VideoTemplateFeatureRow[];
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
                    <FeaturePreview
                      imageSrc={item.imageSrc}
                      title={item.title}
                      video={item.video}
                      videoSrc={item.videoSrc}
                    />
                    <FeatureCopy title={item.title} description={item.description} />
                  </>
                ) : (
                  <>
                    <FeatureCopy title={item.title} description={item.description} />
                    <FeaturePreview
                      imageSrc={item.imageSrc}
                      title={item.title}
                      video={item.video}
                      videoSrc={item.videoSrc}
                    />
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

function FeaturePreview({
  imageSrc,
  title,
  video,
  videoSrc,
}: {
  imageSrc?: string | string[];
  title: string;
  video?: string;
  videoSrc?: string;
}) {
  const imageSources = Array.isArray(imageSrc) && imageSrc.length > 0 ? imageSrc : undefined;
  const singleImageSrc = typeof imageSrc === "string" ? imageSrc : undefined;
  const posterSrc = imageSources?.[0] ?? singleImageSrc;
  const scrollingImageSources = imageSources ? [...imageSources, ...imageSources] : [];

  return (
    <div data-aos="fade-left" className="flex w-full min-w-0 items-center justify-center">
      <div className="group relative aspect-video w-full max-w-[42rem] min-w-0 overflow-hidden rounded-[2rem] border border-border/70 shadow-[0_30px_60px_-42px_rgba(15,23,42,0.56)]">
        {imageSources ? (
          <div className="relative h-full w-full overflow-hidden bg-black p-2 sm:p-2">
            <style>
              {`
                @keyframes feature-image-scroll {
                  from { transform: translateX(0); }
                  to { transform: translateX(-50%); }
                }

                @media (prefers-reduced-motion: reduce) {
                  [data-feature-image-scroll] {
                    animation: none !important;
                  }
                }
              `}
            </style>
            <div
              data-feature-image-scroll
              className="flex h-full w-max items-stretch gap-2 sm:gap-2"
              style={{ animation: "feature-image-scroll 28s linear infinite" }}
            >
              {scrollingImageSources.map((src, index) => (
                <div
                  key={`${src}-${index}`}
                  className="aspect-[9/16] h-full shrink-0 overflow-hidden rounded-md"
                >
                  <img
                    src={src}
                    alt={`${title} preview ${(index % imageSources.length) + 1}`}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                </div>
              ))}
            </div>
            {video ? (
              <FeatureHoverVideo
                src={video}
                poster={posterSrc}
                title={title}
                className="absolute inset-0 h-full w-full cursor-pointer object-cover transition-opacity duration-200"
              />
            ) : null}
          </div>
        ) : singleImageSrc ? (
          <>
            <img
              src={singleImageSrc}
              alt={`${title} preview image`}
              className="h-full w-full object-cover"
              loading="lazy"
            />
            {video ? (
              <FeatureHoverVideo
                src={video}
                poster={posterSrc}
                title={title}
                className="absolute inset-0 h-full w-full cursor-pointer object-cover transition-opacity duration-200"
              />
            ) : null}
          </>
        ) : videoSrc ? (
          <LazyPreviewVideo
            src={videoSrc}
            className="h-full w-full object-cover"
          />
        ) : video ? (
          <FeatureHoverVideo
            src={video}
            title={title}
            className="h-full w-full cursor-pointer object-cover transition-opacity duration-200"
          />
        ) : null}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"></div>
      </div>
    </div>
  );
}
