"use client";

import { usePathname } from "next/navigation";

const HOME_PATH = "/";

function isHomepage(pathname: string, locale: string) {
  if (!pathname) {
    return false;
  }

  let normalized = pathname;

  if (normalized.endsWith("/") && normalized.length > 1) {
    normalized = normalized.slice(0, -1);
  }

  if (!normalized) {
    normalized = HOME_PATH;
  }

  return (
    normalized === HOME_PATH ||
    normalized === `/${locale}`
  );
}

export default function LinkExchange({ locale }: { locale: string }) {
  const pathname = usePathname();

  if (!pathname || !isHomepage(pathname, locale)) {
    return null;
  }
  const html = `        
                            
  `;
  return (
    <section aria-label="link" className="pb-10">
      <div className="mx-auto flex flex-wrap justify-center gap-4 px-8 " dangerouslySetInnerHTML={{ __html: html }}>
      </div>
    </section>
  );
}
