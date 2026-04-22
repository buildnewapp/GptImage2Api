import { SiteConfig } from "@/types/siteConfig";

export const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://sdanceai.com";

const GITHUB_URL = 'https://github.com/sdanceai/awesome_seedance2_prompt'
const TWITTER_URL = ''
const YOUTUBE_URL = ''
const INSTAGRAM_URL = ''
const TIKTOK_URL = ''
const DISCORD_URL = process.env.NEXT_PUBLIC_DISCORD_INVITE_URL
const EMAIL_URL = 'support@sdanceai.com'

export const siteConfig: SiteConfig = {
  name: "Sdance AI",
  tagLine:"Bring Any Character to Life with Seedance 2.0",
  description:"Unleash your creativity with SdanceAI. Powered by the breakthrough Seedance 2.0 model, you can now turn ordinary photos into extraordinary performances. Whether for social media or digital art, create stunning, rhythmic videos in seconds—no motion capture suit required.",
  url: BASE_URL,
  authors: [
    {
      name: "sdanceai",
      url: BASE_URL,
    }
  ],
  creator: '@sdanceai',
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
