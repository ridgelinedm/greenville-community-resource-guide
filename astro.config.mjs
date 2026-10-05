// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// Deployed to GitHub Pages at the custom domain https://place2turn.com/
// (repo Settings → Pages → Custom domain). A custom domain serves from the root,
// so `base` stays '/'.
export default defineConfig({
  site: 'https://place2turn.com',
  base: '/',
  // 'always' matches how the built pages are actually served: each page is a
  // `foo/index.html`, and static hosts 301 `/foo` to `/foo/`. Keeping dev and
  // prod on the same rule stops canonicals and sitemap URLs from disagreeing.
  trailingSlash: 'always',
  // Pages removed when the site narrowed its focus (2026-10). Static redirect
  // pages keep old links and search results from landing on a 404.
  redirects: {
    '/hiv-aids-support/': '/medical-care/',
    '/immigrant-latino-services/': '/resources/',
    '/resource/hispanic-alliance/': '/resources/',
    '/food-assistance/hiv/': '/food-assistance/',
    '/food-assistance/lgbtq/': '/food-assistance/',
    '/food-assistance/spanish-speaking/': '/food-assistance/',
    '/housing-shelter/hiv/': '/housing-shelter/',
    '/housing-shelter/lgbtq/': '/housing-shelter/',
    '/housing-shelter/spanish-speaking/': '/housing-shelter/',
    '/medical-care/hiv/': '/medical-care/',
    '/medical-care/lgbtq/': '/medical-care/',
    '/medical-care/spanish-speaking/': '/medical-care/',
    '/mental-health-recovery/hiv/': '/mental-health-recovery/',
    '/mental-health-recovery/lgbtq/': '/mental-health-recovery/',
    '/mental-health-recovery/spanish-speaking/': '/mental-health-recovery/',
    '/financial-assistance/hiv/': '/financial-assistance/',
    '/financial-assistance/lgbtq/': '/financial-assistance/',
    '/financial-assistance/spanish-speaking/': '/financial-assistance/',
  },
  integrations: [
    sitemap({
      changefreq: 'weekly',
      priority: 0.7,
    }),
  ],
});
