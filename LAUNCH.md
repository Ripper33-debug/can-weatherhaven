# Taking the new site live on weatherhaven.com

The site is ready to launch as far as the code goes. What's left is Weatherhaven's sign-off, a few settings in Vercel, and the domain switch. Budget about half a day, mostly waiting on DNS and approvals.

Current site: https://can-weatherhaven.vercel.app (it shows "Website redesign concept" in the footer and asks search engines not to index it).

---

## 1. Sign-offs from Weatherhaven (before launch)

| What | Who | Why it matters |
|---|---|---|
| All copy and facts | Marketing | Everything is from weatherhaven.com, plus 29 detail pages and 61 news articles carried over from it. |
| The TRECC "3× floor area" claim | Engineering | weatherhaven.com says 3×; the CAD measures about 2.1× (85″ → 178″ wide). The site shows the CAD dimensions. |
| Leadership bios and the 9 regional sales leads | HR / the people named | Names, titles and bios are as published on weatherhaven.com. |
| Publishing the 162-site deployment map | BD / security | It's already public on Weatherhaven's Google map. The globe and sector maps make it much more visible. |
| Privacy page (/privacy) | Legal | It's a draft that describes what this site actually does. Legal should approve or replace it. Terms of use, if wanted, are not written yet. |
| Vector logo (SVG), exec headshots, high-res originals of the low-res photos | Marketing | Only a 658 px logo exists. These photos are 400–700 px wide and get upscaled: history photos, UAV, RDMSS hero, ATEPS 2, MEX 2, Polar 2. |
| App icon | Marketing | The browser and home-screen icon is a placeholder mark in Weatherhaven navy. Swap in their own if they have one (public/icon-*.png, apple-touch-icon.png). |
| Who keeps the content up to date | Management | Content is in `src/content/*.json`, so a developer edits it. A CMS (for example Inplace) would let marketing edit pages directly. |

## 2. Vercel settings (Project → Settings → Environment Variables, Production)

| Variable | Value | Effect |
|---|---|---|
| `SITE_URL` | `https://weatherhaven.com` | Canonical links, sitemap, link previews |
| `PUBLIC_LAUNCH` | `1` | Removes the "Website redesign concept" footer label |
| `PUBLIC_NOINDEX` | delete it (or `0`) | Lets search engines index the site; robots.txt allows crawling and lists the sitemap |
| `RESEND_API_KEY` + `CONTACT_TO` (+ `CONTACT_FROM`) | from Resend; e.g. `sales@weatherhaven.com` | The contact form sends email. `CONTACT_FROM` must be on a domain verified in Resend (DNS records). |
| *or* `HUBSPOT_PORTAL_ID` + `HUBSPOT_FORM_GUID` | from HubSpot | The contact form goes into HubSpot instead |
| `PUBLIC_ANALYTICS` | `vercel` (turn on Web Analytics in Vercel) or `plausible` (+ `PUBLIC_PLAUSIBLE_DOMAIN`) | Visit stats. Both are cookieless, so no cookie banner is needed. |
| `PUBLIC_SENTRY_DSN` | optional | Error reports. The build detects Sentry's inline script and keeps the security policy working. |

Then redeploy (Deployments → … → Redeploy) so the build picks the variables up.

**Without an email provider**, the form tells visitors it isn't connected and gives the phone number and email. Nothing is lost silently, but nothing reaches sales either. Set one before launch.

## 3. The domain switch

1. In Vercel → Project → Settings → Domains, add `weatherhaven.com` and `www.weatherhaven.com`. Pick one as primary; the other redirects to it.
2. Vercel shows the DNS records to create, usually an A record for the apex and a CNAME for www. A day before, lower the TTL on the existing records to 5 minutes, so the switch (and a rollback) takes minutes, not hours.
3. At the DNS host, change **only** those records.
   - **Do not touch** MX, SPF, DKIM or other TXT records (email), or other subdomains such as `secure.weatherhaven.com`, which serves the ISO certificate.
   - PDFs and images on `eiec269001.blob.core.windows.net` (the RFP guide, in-stock list and 40th anniversary book) are linked directly and keep working.
4. Vercel issues the HTTPS certificate on its own once DNS resolves, usually within minutes.

**Old addresses keep working.** The old site was crawled (138 URLs), and each one redirects permanently (301) to its new page:
- section and product pages map to their new paths
- old news links (`/Article?name=…`) open the same article in the new archive
- `/News?page=…` goes to the news page

Search rankings and saved or shared links carry over. The rules are in `scripts/postbuild.mjs`.

## 4. Right after the switch (15 minutes)

```
curl -sI https://weatherhaven.com/ | head -1                                     # 200
curl -sI https://weatherhaven.com/Military/Military-Camp | grep -i location      # /military/camps/
curl -sI https://weatherhaven.com/products/expandable-container/mecc | grep -i location   # /products/mecc/
curl -sI "https://weatherhaven.com/Article?name=cansec-invite" | grep -i location # /news/?article=cansec-invite
curl -s  https://weatherhaven.com/robots.txt                                     # Allow: / and the sitemap
node tests/run.mjs https://weatherhaven.com                                      # 0 failures (checks every page, link and the form)
```

- Send a real test enquiry through /contact and confirm it arrives.
- **Google Search Console:** add the `weatherhaven.com` domain property (verified with a DNS TXT record) and submit `https://weatherhaven.com/sitemap-index.xml`. Watch the Pages report for 404s over the next two weeks.
- Keep the old hosting running for a week, in case a rollback is needed.

**Rollback:** point the DNS records back at the old host. With a 5-minute TTL it takes effect within minutes.

## 5. Ten-minute check on an iPhone and in Safari

This environment only has Chrome, so check these on a real iPhone and in Safari on a Mac:

1. **Home:** the intro plays and the deploy video shows (phones get the video first). Tap **Open 3D model**: the TRECC loads, can be dragged, and **Deploy** works.
2. **Products → MECC:** scroll to "See it deploy". It unfolds on its forest site. Switch to **Studio** and back. **Show inside**, then **Step inside**: drag to look round and tap the floor to walk.
3. **Products → TRECC → See it at full size in AR:** tap **View in your space** and point the camera at the floor.
4. **Solutions → Medical:** the deployment map shows its sites. Tap **Field hospitals**: the page loads with its facts.
5. **Company → News:** open an article. Use **Older** / **Newer**.
6. **Contact:** the fields are easy to tap, phone numbers don't break across lines, and submitting shows a clear message.
7. Rotate the phone on a product page: nothing spills sideways.
8. **Safari on the Mac:** the home hero in each climate, the globe on **Where we've worked**, and the camp planner in 3D.

Anything odd: note the page, the device and the iOS version.

## 6. Already done

- Pages, links, structured data and phone widths are tested on every build: `node tests/run.mjs <url>`.
- Accessibility: 0 axe-core violations across 19 page types (`node scripts/a11y.mjs <url>`).
- Performance budget: under 2 MB first load on desktop and phone (`node scripts/budget.mjs <url>`). Phones and computers without a GPU get video and photos until someone asks for 3D.
- Security:
  - strict Content-Security-Policy (inline scripts only on the AR pages), HSTS, frame and referrer policies
  - `npm audit` reports 0 vulnerabilities (Astro 7, Vercel adapter 11, patched path-to-regexp pinned)
  - the form caps request size and never logs personal data
- Caching: hashed and versioned files are cached for a year, everything else for a day, and HTML always revalidates.
