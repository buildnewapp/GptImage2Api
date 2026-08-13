import { siteConfig } from '@/config/site'
import type { MetadataRoute } from 'next'

const siteUrl = siteConfig.url

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/private/',
        '/api/',
        '/auth/',
        '/_next/',
        '/assets/',
        '/cdn-cgi/',
      ],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  }
}
