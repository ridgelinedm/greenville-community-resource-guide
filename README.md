# Greenville Community Resource Guide

🟢 **Live:** https://ridgelinedm.github.io/greenville-community-resource-guide/
&nbsp;·&nbsp; Repo: `ridgelinedm/greenville-community-resource-guide` (GitHub Pages)

A free, accessible, and trustworthy directory of food, housing, medical, mental-health, and
crisis resources in **Greenville County, South Carolina** — built so that anyone (or any AI
assistant) searching their exact situation lands on a page with the right local help.

> **Deployment is already wired up.** Every push to `main` rebuilds and redeploys automatically
> via `.github/workflows/deploy.yml`. Just edit, commit, and push — the live site updates in
> ~1 minute.

Built with [Astro](https://astro.build) → outputs plain static HTML that search engines and
LLMs crawl perfectly. **63 organizations**, **15 categories**, **62 intent pages**, and a
detail page for every resource — **145 pages total**, all generated from a single CSV.

---

## The big idea: intent-based pages

The site is organized around two dimensions pulled from the data:

1. **Service** — what an org provides (Food, Housing, Medical, Mental Health, …)
2. **Audience** — who it serves, parsed from the CSV's `Serves` column (Veteran, Domestic
   Violence, Youth, Re-entry, Families, Spanish-speaking, …)

Crossing them produces **intent pages** like _“Housing & Shelter for Survivors of Domestic
Violence in Greenville, SC.”_ Each has empathetic copy, the filtered + relevance-ranked
resource list, an FAQ, and JSON-LD (`FAQPage`, `ItemList`, `BreadcrumbList`) so it can win
organic search **and** be cited by answer engines. This is how one person's unique
circumstance maps to one dedicated, useful URL.

### Page types

| Type | Example URL | Count |
| --- | --- | --- |
| Home | `/` | 1 |
| Category hubs | `/food-assistance` | 15 |
| Intent pages | `/housing-shelter/domestic-violence` | 62 |
| Resource details | `/resource/safe-harbor` | 63 |
| Directory (search) | `/resources` | 1 |
| Emergency / About / 404 | `/get-help-now`, `/about` | 3 |

### Three kinds of category

Categories are typed so they're handled correctly for SEO (no thin/doorway pages):

- **Service categories** (`intents: true`) — Food, Housing, Medical, Mental Health & Recovery,
  and Financial & Crisis Assistance. These generate the Category × Audience intent pages and are
  featured on the homepage.
- **Population categories** (`population: '<audience>'`) — Veteran, Youth, Family, HIV/AIDS,
  Re-entry, and Immigrant services. The category _is_ the audience, so instead of redundant
  cross pages, each is a **hub** that links out (spoke links) to that population's intent pages
  across every service category.
- **Standalone hubs** — Legal, Transportation, Education, Community: clean directory hubs.

---

## Editing the content

**All resource data lives in [`gvl_homeless_resources.csv`](./gvl_homeless_resources.csv)** at the
project root. Edit it in any spreadsheet app, save, and rebuild — the whole site regenerates.

Two things are enriched in code, in [`src/data/resources.ts`](./src/data/resources.ts):

- **Categories + descriptions** — the `META` map keys each organization (by its exact name in
  the CSV) to its service categories and a short blurb. Add a new org to the CSV, then add a
  matching `META` entry. (If you forget, the build prints a warning and defaults it to
  "Community Services," so nothing silently breaks.)
- **Taxonomy** — `CATEGORIES` and `AUDIENCES` define the category/audience labels, slugs, intro
  copy, and the keywords used to surface the most relevant orgs first on each intent page.

To add a new **core category** to the homepage, set `core: true` on it in `CATEGORIES`.
Intent pages are generated automatically for every core category × audience pair that has at
least 2 matching resources (`MIN_RESOURCES_FOR_INTENT`).

---

## Develop & build

```bash
npm install        # one time
npm run dev        # local dev server at http://localhost:4321
npm run build      # generates the static site into dist/
npm run preview    # serve the built dist/ locally
```

Requires Node 18+ (developed on Node 24).

---

## Deploying

> **First, set your domain.** Open [`astro.config.mjs`](./astro.config.mjs) and change `site`
> to your real URL. This drives canonical tags, the sitemap, and JSON-LD. Then update the
> `Sitemap:` line in [`public/robots.txt`](./public/robots.txt) to match.

### Current setup — GitHub Pages (already live)

This repo is **already deployed** to GitHub Pages at the URL above. Pages source is set to
*GitHub Actions*, and `.github/workflows/deploy.yml` builds + deploys on every push to `main`.
Nothing else to do — just push.

`astro.config.mjs` is configured for the project-page subfolder:
```js
site: 'https://ridgelinedm.github.io',
base: '/greenville-community-resource-guide',
```

### Moving to a custom domain later

1. In **Settings → Pages → Custom domain**, add your domain (creates a `CNAME` file) and set the
   DNS records GitHub shows you.
2. In `astro.config.mjs`, set `site` to your domain and change `base` back to `'/'`.
3. Update the `Sitemap:` line in `public/robots.txt`. Push — done.

### Option B — Vercel (simplest, zero config)

1. Push to GitHub (as above).
2. In Vercel: **Add New → Project → import the repo**. Vercel auto-detects Astro and deploys.
   Every push redeploys. Add your custom domain in the project settings.

Either way the output is the same fast, static HTML.

---

## Notes & next steps

- **Accuracy:** Every page reminds visitors to call ahead — hours and eligibility change. Keep
  the CSV current; that's the single source of truth.
- **Scaling categories:** Five service categories (Food, Housing, Medical, Mental Health &
  Recovery, Financial) carry the intent pages. To turn another category into a full intent-page
  category, set `intents: true` (and `core: true` to feature it on the homepage) in
  `src/data/resources.ts`. To make a category a population hub instead, set
  `population: '<audience-key>'`.
- **OG image:** `public/og-default.svg` is a placeholder. Some social platforms prefer PNG —
  export a 1200×630 PNG and point `image` to it in `src/layouts/Base.astro` if you want richer
  link previews.
- **Verified at build:** all 7,473 internal links resolve, and every JSON-LD block is valid.
