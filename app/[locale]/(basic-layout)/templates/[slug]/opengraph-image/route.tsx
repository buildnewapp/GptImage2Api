import { siteConfig } from "@/config/site";
import { templateCms } from "@/lib/cms";
import { ImageResponse } from "next/og";

export const alt = "Template";
export const contentType = "image/png";
export const size = {
  width: 1200,
  height: 630,
};

type RouteContext = {
  params: Promise<{
    locale: string;
    slug: string;
  }>;
};

export async function GET(_request: Request, { params }: RouteContext) {
  const { locale, slug } = await params;
  const { metadata } = await templateCms.getPostMetadata(slug, locale);

  if (!metadata) {
    return new ImageResponse(
      (
        <div
          style={{
            fontSize: 60,
            backgroundColor: "#fafafa",
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            color: "black",
          }}
        >
          <div>{siteConfig.name}</div>
        </div>
      ),
      size,
    );
  }

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const logoUrl = `${baseUrl}/logo.png`;
  const title =
    metadata.title.length > 60
      ? `${metadata.title.substring(0, 60)}...`
      : metadata.title;

  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 60,
          background: "linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          color: "black",
          position: "relative",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "0 80px",
          }}
        >
          <img
            src={logoUrl}
            alt="Logo"
            width="120"
            height="120"
            style={{
              marginBottom: "40px",
            }}
          />
          <div
            style={{
              fontSize: title.length > 40 ? 48 : 56,
              fontWeight: "bold",
              textAlign: "center",
              lineHeight: 1.2,
              maxWidth: "1000px",
            }}
          >
            {title}
          </div>
        </div>
        <div
          style={{
            fontSize: 24,
            opacity: 0.9,
            position: "absolute",
            bottom: 60,
          }}
        >
          {siteConfig.name}
        </div>
      </div>
    ),
    size,
  );
}
