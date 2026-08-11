import { getPartnerSnippetsForPlacement } from "@/lib/partners/partner-snippets";

export default async function PartnerMarquee() {
  const partnerSnippets = await getPartnerSnippetsForPlacement("home");

  if (partnerSnippets.length === 0) {
    return null;
  }

  return (
    <div
      data-partner-marquee
      className="mt-6 flex overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]"
    >
      <style>
        {`
          @keyframes partner-marquee-scroll {
            to {
              transform: translateX(-100%);
            }
          }

          [data-partner-marquee-group] {
            animation: partner-marquee-scroll 60s linear infinite;
          }

          [data-partner-marquee]:hover [data-partner-marquee-group],
          [data-partner-marquee]:focus-within [data-partner-marquee-group] {
            animation-play-state: paused;
          }

          @media (prefers-reduced-motion: reduce) {
            [data-partner-marquee-group] {
              animation: none !important;
            }
          }
        `}
      </style>
      {[0, 1].map((copyIndex) => (
        <div
          key={copyIndex}
          data-partner-marquee-group
          aria-hidden={copyIndex === 1 ? true : undefined}
          inert={copyIndex === 1 ? true : undefined}
          className="flex min-w-full shrink-0 items-center justify-around gap-3 pr-3 will-change-transform"
        >
          {partnerSnippets.map((snippet) => (
            <div
              key={snippet.key}
              className="shrink-0"
              dangerouslySetInnerHTML={{ __html: snippet.html }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
