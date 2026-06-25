/**
 * Base-path-aware URL helpers.
 *
 * The site may be served from a subfolder (e.g. GitHub Pages project page at
 * /greenville-community-resource-guide/). Astro does NOT auto-prefix root-relative
 * hrefs, so every internal link/asset is run through `link()`. External links,
 * `tel:`, `mailto:`, and `#fragments` pass through untouched.
 *
 * `import.meta.env.BASE_URL` is the configured `base`, always with a trailing slash
 * (e.g. '/greenville-community-resource-guide/' or '/').
 */
const BASE = import.meta.env.BASE_URL;
const BASE_NO_SLASH = BASE.endsWith('/') ? BASE.slice(0, -1) : BASE; // '' when base is '/'

/** Prefix a root-relative path ("/foo", "/foo?x=1") with the configured base. */
export function link(path: string): string {
  if (typeof path !== 'string' || !path.startsWith('/')) return path;
  if (path === '/') return `${BASE_NO_SLASH}/`;
  return `${BASE_NO_SLASH}${path}`;
}

/** Absolute URL for canonical tags / structured data: origin + base-prefixed path. */
export function absolute(origin: string, path: string): string {
  const clean = origin.replace(/\/$/, '');
  return `${clean}${link(path)}`;
}

/** Strip the base prefix from a pathname (so we can re-add it canonically). */
export function stripBase(pathname: string): string {
  if (BASE_NO_SLASH && pathname.startsWith(BASE_NO_SLASH)) {
    return pathname.slice(BASE_NO_SLASH.length) || '/';
  }
  return pathname;
}
