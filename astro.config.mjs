// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// Deployed to GitHub Pages at https://ridgelinedm.github.io/greenville-community-resource-guide/
// `site` is the origin; `base` is the repo subfolder. When you move to a custom
// domain, set `site` to that domain and change `base` back to '/'.
export default defineConfig({
  site: 'https://ridgelinedm.github.io',
  base: '/greenville-community-resource-guide',
  trailingSlash: 'ignore',
  integrations: [
    sitemap({
      changefreq: 'weekly',
      priority: 0.7,
    }),
  ],
});
