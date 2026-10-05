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
  integrations: [
    sitemap({
      changefreq: 'weekly',
      priority: 0.7,
    }),
  ],
});
