import { SiteConfig } from "@/types/siteConfig";

export const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://gptimage2api.net";

const GITHUB_URL = 'https://github.com/gpt-image2'
const TWITTER_URL = ''
const YOUTUBE_URL = ''
const INSTAGRAM_URL = ''
const TIKTOK_URL = ''
const DISCORD_URL = process.env.NEXT_PUBLIC_DISCORD_INVITE_URL
const HUGGINGFACE_URL = process.env.NEXT_PUBLIC_HUGGINGFACE_SPACE_URL
const EMAIL_URL = 'support@gptimage2api.net'

export const siteConfig: SiteConfig = {
  name: "GPT Image 2.5",
  tagLine: "GPT Image 2.5 – Fast & Reliable Image API for Developers",
  description:
    "GPT Image 2.5 provides powerful image API access for developers, startups, and businesses to generate high-quality AI images with simple REST endpoints. Build image generation apps, automate creative workflows, and integrate GPT Image 2.5 API into your products instantly.",
  url: BASE_URL,
  authors: [
    {
      name: "GPT Image 2.5",
      url: BASE_URL,
    }
  ],
  creator: '@gptimage2api',
  socialLinks: {
    github: GITHUB_URL,
    twitter: TWITTER_URL,
    youtube: YOUTUBE_URL,
    instagram: INSTAGRAM_URL,
    tiktok: TIKTOK_URL,
    discord: DISCORD_URL,
    huggingface: HUGGINGFACE_URL,
    email: EMAIL_URL,
    // add more social links here
  },
  themeColors: [
    { media: '(prefers-color-scheme: light)', color: 'white' },
    { media: '(prefers-color-scheme: dark)', color: 'black' },
  ],
  defaultNextTheme: 'light', // next-theme option: system | dark | light
  structuredData: {
    applicationCategory: "MultimediaApplication",
    image: "/logo.png",
    operatingSystem: "Web",
    priceCurrency: "USD",
    rating: {
      bestRating: 5,
      count: 76,
      value: 4.8,
      worstRating: 1,
    },
  },
  icons: {
    icon: "/favicon.ico",
    shortcut: "/logo.png",
    apple: "/logo.png", // apple-touch-icon.png
  },
}
