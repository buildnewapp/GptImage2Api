import { SiteConfig } from "@/types/siteConfig";

export const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://gptimage2api.net";

const GITHUB_URL = 'https://github.com/gpt-image2'
const TWITTER_URL = ''
const YOUTUBE_URL = ''
const INSTAGRAM_URL = ''
const TIKTOK_URL = ''
const DISCORD_URL = process.env.NEXT_PUBLIC_DISCORD_INVITE_URL
const EMAIL_URL = 'support@gptimage2api.net'

export const siteConfig: SiteConfig = {
  name: "GptImage2Api",
  tagLine: "GptImage2Api – Fast & Reliable GPT Image 2 API for Developers",
  description:
    "GptImage2Api provides powerful GPT Image 2 API access for developers, startups, and businesses to generate high-quality AI images with simple REST endpoints. Build image generation apps, automate creative workflows, and integrate GPT Image 2 API into your products instantly.",
  url: BASE_URL,
  authors: [
    {
      name: "gptimage2api",
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
    email: EMAIL_URL,
    // add more social links here
  },
  themeColors: [
    { media: '(prefers-color-scheme: light)', color: 'white' },
    { media: '(prefers-color-scheme: dark)', color: 'black' },
  ],
  defaultNextTheme: 'light', // next-theme option: system | dark | light
  icons: {
    icon: "/favicon.ico",
    shortcut: "/logo.png",
    apple: "/logo.png", // apple-touch-icon.png
  },
}
