// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// Deployed to GitHub Pages at https://ridgelinedm.github.io/greenville-community-resource-guide/
// `site` is the origin; `base` is the repo subfolder. When you move to a custom
// domain, set `site` to that domain and change `base` back to '/'.
export default defineConfig({
  site: 'https://ridgelinedm.github.io',
  base: '/greenville-community-resource-guide',
  // 'always' matches how the built pages are actually served: each page is a
  // `foo/index.html`, and static hosts 301 `/foo` to `/foo/`. Keeping dev and
  // prod on the same rule stops canonicals and sitemap URLs from disagreeing.
  trailingSlash: 'always',
  integrations: [
    sitemap({
      changefreq: 'weekly',
      priority: 0.7,
    }),
  ],
});
