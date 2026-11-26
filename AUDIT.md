# Site audit, 25 November 2026

This audit covers https://can-weatherhaven.vercel.app at commit `7f90e4b`. Nothing on the site was changed for it.

**Bottom line:** the site is in good shape. Every page loads without script errors, there are no broken links or images, and desktop speed and accessibility scores are close to perfect. The real problems are in three places:

- **The home page globe on phones.** It shows as an empty box with dead buttons (#1).
- **What happens on launch day.** Several things only break once the site moves to weatherhaven.com: old links, source links and one security setting.
- **Phone polish.** Phones load more slowly than desktops, and a few layouts need tidying.

Every item has an effort estimate: **S** is under an hour, **M** is 1–3 hours, **L** is a day or more.

---

## What was checked

| Area | How |
|---|---|
| All 116 pages, desktop (1440 px) and phone (390 px) | Script errors, failed requests, layout shift, broken images, images that are too large or too small, headings, duplicate IDs, unlabeled buttons and fields, tap-target size, text size, sideways scroll, title, description, canonical link, share image, structured data |
| Speed | Lighthouse on 18 page types, phone and desktop, against the live site |
| Accessibility | axe-core on all 116 pages at both sizes (see appendix), plus manual keyboard testing |
| Links | 106 external links, 22 web addresses inside news articles, and old weatherhaven.com addresses tried against the new site: all 59 redirects, case variants and common old paths |
| Look and layout | Full-page screenshots of 26 page types at both sizes, reviewed by eye |
| Features, by hand | Search, menus, keyboard-only use, shelter finder, compare, RFP checklist and its download, contact form (validation only, nothing sent), news archive, old article links, section deep links, phone menu, camp planner (add, undo, 3D, download, "quote with this plan", reload, clear), globe (filters, views, stories), all 11 product 3D viewers, AR pages |
| Content | Spelling pass over every page, the news archive against weatherhaven.com (it is current to 1 Oct 2026), people against the old About and Company pages, odd leftovers from the old site |
| Code | Form endpoint, security headers, build, tests, bundle sizes, repo |

**Not checked:** a real iPhone or Safari (LAUNCH.md §5 still applies), and the real-GPU look on your Mac (Chrome didn't respond this time). I also didn't send a real enquiry, because no email provider is set up yet.

---

## Scorecard

- **0** script errors and **0** failed requests across 232 page loads (116 pages × 2 sizes)
- **0** broken internal links and **0** broken images. Every image has alt text, every page has exactly one H1, and there are no duplicate titles or IDs and no sideways scroll on phones.
- **Lighthouse, desktop:** 99–100 performance on 16 of 18 page types. The two exceptions are the globe page (60, see #1) and the AR page (64).
- **Lighthouse, phone:** 87–98 performance. The largest image appears in 2.1–3.9 s on Lighthouse's slow-4G phone simulation, and Google's "good" mark is 2.5 s. 9 of 18 page types are over it.
- **Accessibility:** axe found 0 problems on all 116 pages at desktop size, and 1 at phone size: the compare page's sideways-scrolling scale strip (#12). Lighthouse scored 100 on 35 of 36 runs; the one miss is the AR button (#12).
- **External links:** 105 of 106 respond. LinkedIn blocks automated checks, which is normal.
- **All 11 product 3D viewers** load their models with no errors, and the planner and AR pages work. The globe works where it loads (see #1).
- **Spelling:** no real typos beyond the few listed below. Canadian spelling (defence, centre, honoured) is used consistently.

---

## Fix before launch

Item 1 is the most visible bug on the site. Items 2–6 only break once the site is on weatherhaven.com. Items 7–9 are quick fixes that belong in the same pass.

### 1. The home page globe is an empty box on phones, and freezes computers without a graphics card · M
**On phones.** Phones never load the 3D engine on the home page (that's deliberate, to save data). But the "field record" section still shows the Satellite / Night / Field switch and the zoom buttons over an empty dark panel about 360 px tall. It looks broken on the home page, on every phone.

**On computers without a GPU.** The /record page does the opposite: it loads the globe even on machines with no real GPU, such as the VDI and Citrix desktops common in defence and government. Lighthouse measured 33 seconds of frozen main thread on desktop, and the page scores 60. That is also what Google's PageSpeed test will show.

**Fix:** wherever 3D is off, show the flat dot map from the sector pages with the story list, plus an "Open the globe" button. Hide the view and zoom controls until the globe is actually running. Use the same GPU check the product pages already use.

### 2. Old links that differ only in capitals will 404 · S
The old site ignores capitals; the new redirects don't. Each of these works on weatherhaven.com today and 404s on the new site:

- `/contactus`, `/aboutus`
- `/military/military-camp`
- `/Products/Expandable-Container/MECC`
- `/article?name=…`

Backlinks, bookmarks and Google's index all contain variants like these.

**Fix:** make the redirects ignore capitals. The exceptions are the old paths that would clash with new pages if capitals were ignored (`/Military`, `/Medical`, `/Commercial`, `/Products`, `/Company`, `/Innovation`, `/News`); keep those case-sensitive. The `/Article?name=` rule can ignore capitals too.

### 3. Old paths with nothing behind them · S
These answer on the old site but 404 on the new one:

- `/sitemap.xml`. Google Search Console probably has this one registered. Redirect it to `/sitemap-index.xml`.
- `/favicon.ico`. Browsers and Google ask for it. Add the file.
- `/Default.aspx` and `/Home`. Redirect both to `/`.

### 4. Source links will point back at the page you're on · S
News articles say "Published on weatherhaven.com" and detail pages say "From weatherhaven.com": 90 pages in all. After the switch, those addresses redirect straight back to the page the reader is already on, opened in a new tab.

The supplier page's "Full supplier information on weatherhaven.com" link loops the same way.

**Fix:** hide these lines when `PUBLIC_LAUNCH=1`.

### 5. The contact form ignores `?product=` and `?sector=` on a fresh page load · S
Clicking "Request a quote" inside the site works. But opening `/contact/?product=trecc` directly leaves the product unselected. That happens with a new tab, a shared link, or a link in an email or ad.

The cause: the first page load reuses the prebuilt page and never applies those two settings. The RFP and planner hand-offs are fine.

### 6. The HTTPS-only security setting covers every subdomain, for 2 years · S, plus a question for IT
The site sends `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`. Once browsers see that on weatherhaven.com, they refuse plain-HTTP connections to every `*.weatherhaven.com` for two years.

- `www`, `secure`, `uk` and `peru` all work over HTTPS.
- `br.weatherhaven.com` and `autodiscover.weatherhaven.com` answer only over HTTP.

**For launch:** drop `preload`, and drop `includeSubDomains` until IT confirms nothing needs HTTP.

### 7. The regional sales leads list runs to the screen edge · S
On /company/leadership the "Regional sales leads" block sits outside the page margins. The text touches the left and right edges at every screen size. It's a visible bug and an easy fix.

### 8. Use Weatherhaven's real icon · S
The browser and home-screen icon is still a placeholder. weatherhaven.com already publishes its real icon set: the navy, white and orange shelter mark, at 16 to 192 px on their blob storage.

Use those files. That also takes one item off the sign-off list in LAUNCH.md.

### 9. Check HubSpot field names, if they choose HubSpot · M (once they have the form)
The endpoint sends fields named `name`, `org`, `sector`, `region`, `product`, `message` and `page`. HubSpot forms use their own internal names (`firstname`, `lastname`, `company`, `email`, `phone`, …). Fields that don't match are dropped or rejected.

The endpoint needs a mapping, and someone should send one real test submission. This isn't needed if they use Resend.

---

## Worth doing soon, ranked by impact

### 10. Phone load speed · M
On a simulated slow phone the main image takes 2.1–3.9 s; the target is under 2.5 s. Three causes:

- **Lazy-loaded main images.** On /plan and the compare page, the main image waits to load, which adds 1.6–2.3 s before it starts downloading. These should load first, as they already do on /company.
- **One image size for every screen.** Phones download desktop-sized images, wasting 74–193 KB per page. Add an 800 px version and let phones pick it.
- **Full-size renders as thumbnails.** On each product page, the two 3D renders in the gallery (1440 px, about 180 KB each) are shown as 88 px thumbnails. Make small thumbnails.

### 11. Images stretched beyond their size · S–M
- **Footer logo.** The large "Weatherhaven" wordmark in every footer is a 653 px PNG stretched to 1,208 px. It's soft on any screen and blurry on a Retina one. Trace it to SVG until Marketing supplies a vector logo.
- **News photos.** 12 news photos are blown up to 672 px wide from as little as 154 px. Haiti, the Finance Committee visit and Operation Western Front are the worst. Show small photos at their real size instead of stretching them.

### 12. Accessibility gaps · S
- **Contact form errors aren't announced.** When a field fails validation, the error appears visually but isn't linked to the field (`aria-invalid` / `aria-describedby` are missing). Screen-reader users hear nothing.
- **Search results aren't read out.** The results mark the highlighted item with `aria-pressed` instead of `aria-selected`, and the search box doesn't point at it (`aria-activedescendant`). Arrowing through results is silent.
- **AR button contrast.** "View in your space" is white on orange at 2.6:1, below the 4.5:1 minimum. Use the navy text the rest of the site uses on orange.
- **Compare page scale strip, on phones.** It scrolls sideways but can't be reached with the keyboard. Add `tabindex="0"` and a label. This is the only axe problem on the whole site.

### 13. Small tap targets on phones · S
These fall under the 24 px minimum in WCAG 2.2:

- the footer phone numbers and email (18 px tall)
- "Privacy" (22 px)
- the announcement bar link (21 px)
- "Peru" in the footer

### 14. The footer is very long on phones · S
On phones the footer is about 2,000 px of single-column links, roughly a third of a product page. Two columns, or collapsible groups, would fix it.

### 15. Search gaps · S
- "ISO 9001" doesn't find the Quality page, which isn't in the search index at all.
- "hangar" and "brochure" find nothing, though people will type them. The site does cover aircraft hangars (large softwall shelters, MEX-26), and the RFP guide and HQSS spec sheet are the closest thing it has to brochures.

**Fix:** add the Quality page and a short synonyms list: hangar → MEX-26 and large softwall shelters; brochure or spec sheet → RFP guide and HQSS spec sheet; ISO → Quality.

### 16. SEO details · S
- **Shared description.** Seven pages share one meta description: home, company, contact, innovation, news, privacy and record. Give each its own, using copy from weatherhaven.com.
- **Company structured data is thin.** It has no social profiles (`sameAs`), address or founding year. Those feed Google's company panel.
- **Default share image.** 42 pages use it: 10 main pages and 32 articles. That includes the home page and articles that have their own photo.
- **Articles are labelled as generic pages.** They should say "article" with a publish date.
- **Two news titles are in ALL CAPS.** They are the Compotech and SFU articles.
- **One title has a typo:** "Aquired" should be "Acquired".

### 17. Leftovers from the old site in news articles · S–M
- "click HERE to download a PDF" in the 40th-anniversary article has no link. The PDF exists, so link it.
- "Click photos below" in the Haiti article has no photos below it.
- About 20 web addresses appear as plain text. Five are dead: news.gc.ca, Canadian Defence Review, the Compotech PDF, the EY 2021 page and forces.gc.ca. Turn the live ones into links and drop the dead ones.

### 18. Small bugs · S
- `/record/?filter=` with a quote mark in it throws a script error, because the value goes straight into a CSS selector.
- **Globe filter.** Changing it leaves the previous story showing; for example, Burnaby head office stays up under "Commercial".

---

## Polish

- **Section links.** "All news" and "All products" float mid-page in their section headers; align them right.
- **Home page quote.** On phones the "From the field" label sits under the quote; it should be above.
- **Product bar on phones.** It cuts "Applications" mid-word.
- **Product 3D viewer on phones.** The full-screen button wraps onto its own line.
- **Planner on phones.** The shelter cards are cut off at the right ("12'6" hig…").
- **Footer clocks on phones.** Five clocks in two columns leaves one on its own, and "United Kingdom Global Solutions" wraps to four lines.
- **Compare.** The compare tray empties on a full page reload. Keep it for the visit.
- **News archive.** It has year buttons but no search or topic filter, across 61 articles.
- **Copy to check with Marketing.** This is verbatim from weatherhaven.com, but reads oddly on a company page:
  - US advisory board bios give a birth date, and one says "is a native of Covington, Georgia"
  - "fold out in to apartment" should be "into"

---

## Code and maintenance

- **Tests only run on this machine.** `tests/run.mjs`, `a11y.mjs` and `budget.mjs` load Playwright from a path that only exists here. Add Playwright as a dev dependency so Weatherhaven's developer can run `npm test`. Then add a GitHub Action that runs the build, tests, accessibility and budget checks on every pull request. · M
- **Two copies of three.js.** r128 runs the home hero, planner and globe; 0.184 runs the product pages. A visitor who goes from home to a product downloads both, about 340 KB compressed. Moving the old viewer onto the bundled copy fixes that. · L, after launch
- **Unminified scripts.** `viewer3d.js` (162 KB) and `GLTFLoader.js` (97 KB) are served as-is. Minifying saves about 25 KB compressed. · S
- **Form rate limit.** The limit lives in each serverless instance's memory, so it's weak. That's fine at launch; add Vercel BotID or Cloudflare Turnstile if spam shows up.
- **Product structured data.** It has no price or offer, so Search Console will show "product snippet" warnings. These are harmless for quote-only products; accept them or switch to a different schema type.
- **Repo size.** The repo is 120 MB because the 3D models and videos are in git. Move them to Git LFS if it keeps growing.

---

## Suggested order

| | What | Effort |
|---|---|---|
| 1 | Home globe fallback #1, launch fixes #2–#8 | ~4 h |
| 2 | Phone speed #10, stretched images #11 | ~3.5 h |
| 3 | Accessibility #12–#13, phone footer #14, search #15 | ~2.5 h |
| 4 | SEO #16, news leftovers #17, small bugs #18, polish | ~3 h |
| 5 | Tests in CI, minify, then the three.js merge after launch | ~1.5 h + 1–2 days |

#9 (HubSpot) waits until Weatherhaven picks its form provider.

---

## Appendix: data behind this report

The raw output is in the audit scratch folder; ask if you want any of it:

- the page sweep (`sweep_local.json`)
- Lighthouse reports (`lh/`)
- axe results (`axe_desktop.json`, `axe_phone.json`)
- the external link check (`ext_status.txt`)
- the hands-on test log
- screenshots
