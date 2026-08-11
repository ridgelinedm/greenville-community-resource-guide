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

/**
 * Files must not get a trailing slash — only page paths do. Matches a short
 * extension on the last segment (".svg", ".css", ".xml"), not dots that occur
 * inside a slug (e.g. "/resource/new-horizon-family-health-services-inc.").
 */
const IS_FILE = /\/[^/]*\.[a-z0-9]{2,5}$/i;

/**
 * Prefix a root-relative path ("/foo", "/foo?x=1") with the configured base,
 * and give page paths a trailing slash.
 *
 * The slash matters: pages are built as `foo/index.html`, and static hosts
 * (GitHub Pages included) answer `/foo` with a 301 to `/foo/`. Linking without
 * it made every internal click pay a redirect, and pointed canonical tags at a
 * redirecting URL rather than the one that actually returns 200.
 */
export function link(path: string): string {
  if (typeof path !== 'string' || !path.startsWith('/')) return path;
  if (path === '/') return `${BASE_NO_SLASH}/`;

  // Split off ?query and #fragment so the slash lands on the path itself.
  const [, p, suffix] = /^([^?#]*)([?#].*)?$/.exec(path) as RegExpExecArray;
  const needsSlash = !IS_FILE.test(p) && !p.endsWith('/');
  return `${BASE_NO_SLASH}${p}${needsSlash ? '/' : ''}${suffix ?? ''}`;
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
