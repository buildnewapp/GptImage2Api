/**
 * Blog Data Loader for Cloudflare Workers
 * 
 * This module loads pre-generated blog data from the TypeScript file
 * created during the build process. This allows Cloudflare Workers
 * to serve local blog content without filesystem access.
 * 
 * NOTE: This file imports from './blog-data' which is auto-generated.
 * Run `pnpm blog:build-data` to regenerate the data file.
 */

// Import from the auto-generated blog data file
// If the file doesn't exist (during initial setup), provide empty fallback
let blogDataModule: typeof import('./blog-data') | null = null;

try {
  blogDataModule = require('./blog-data');
} catch {
  // blog-data.ts doesn't exist yet - will be generated at build time
  console.warn('[blog-data-loader] blog-data.ts not found. Run `pnpm blog:build-data` to generate.');
}

import type { BlogPostData } from './blog-data';

export type { BlogPostData };

/**
 * Get all blog posts for a locale
 */
export function getBlogData(locale: string): BlogPostData[] {
  if (!blogDataModule) return [];
  return blogDataModule.blogData[locale] || [];
}

/**
 * Get a single blog post by slug
 */
export function getBlogPostBySlug(slug: string, locale: string): BlogPostData | undefined {
  if (!blogDataModule) return undefined;
  const posts = blogDataModule.blogData[locale] || [];
  const normalizedSlug = slug.replace(/^\//, '').replace(/\/$/, '');
  
  return posts.find(post => {
    const postSlug = (post.slug || '').replace(/^\//, '').replace(/\/$/, '');
    return postSlug === normalizedSlug;
  });
}

/**
 * Get all available locales
 */
export function getAvailableLocales(): string[] {
  if (!blogDataModule) return [];
  return Object.keys(blogDataModule.blogData);
}

/**
 * Check if a post exists
 */
export function hasBlogPost(slug: string, locale: string): boolean {
  return getBlogPostBySlug(slug, locale) !== undefined;
}
