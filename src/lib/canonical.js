/* Which URLs are real pages, and which only open a parent page scrolled to a section.
   Section URLs (/military/why/, /company/leadership/, /buy/rfp/ …) point their canonical at the parent
   and stay out of the sitemap, so search engines see one page, not several copies of it. */
import DETAILS from '../generated/details-index.json';
import PRODUCTS from '../content/products.json';
import SECTORS from '../content/sectors.json';
import NEWSA from '../generated/news-index.json';

export function detailKey(seg) {
  const [a, b, c] = seg;
  if (SECTORS[a] && b && !c && DETAILS[`${a}/${b}`]) return `${a}/${b}`;
  if (a === 'services' && b === 'support' && c && DETAILS[`support/${c}`]) return `support/${c}`;
  if (a === 'services' && b && !c && DETAILS[`services/${b}`]) return `services/${b}`;
  if (a === 'products' && b === 'accessories' && c && DETAILS[`accessories/${c}`]) return `accessories/${c}`;
  return null;
}
const segs = path => path.replace(/^\/|\/$/g, '').split('/').filter(Boolean);
/** True when the path renders its own page (not a parent page scrolled to a section). */
export function isOwnPage(path) {
  const s = segs(path);
  if (s.length < 2) return true;
  if (detailKey(s)) return true;
  if (s.length === 2 && s[0] === 'products' && (s[1] === 'compare' || PRODUCTS.some(p => p.id === s[1]))) return true;
  if (s.length === 2 && s[0] === 'news' && NEWSA.some(n => n.slug === s[1])) return true;
  return false;
}
/** The page a path really shows: itself, or the nearest parent that is a page of its own. */
export function canonicalPath(path) {
  let s = segs(path);
  while (s.length && !isOwnPage('/' + s.join('/') + '/')) s = s.slice(0, -1);
  return s.length ? '/' + s.join('/') + '/' : '/';
}
