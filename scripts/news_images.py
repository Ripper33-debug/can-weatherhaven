#!/usr/bin/env python3
"""Download each news article's image (from src/content/news-archive.json), save a 1200px WebP in
public/assets/news/, and write src/generated/news-img.json (slug -> path). Images are hosted here
because the site's security policy only loads images from its own domain.
Run: python3 scripts/news_images.py"""
import io, json, os, sys, urllib.request
from PIL import Image

ARCHIVE, OUT_DIR, MAP = 'src/content/news-archive.json', 'public/assets/news', 'src/generated/news-img.json'

def main():
    news = json.load(open(ARCHIVE))
    os.makedirs(OUT_DIR, exist_ok=True)
    out, failed = {}, []
    for n in news:
        url, slug = n.get('image'), n['slug']
        if not url:
            continue
        dest = f'{OUT_DIR}/{slug}.webp'
        if not os.path.exists(dest):
            try:
                req = urllib.request.Request(url.replace(' ', '%20'), headers={'User-Agent': 'Mozilla/5.0'})
                data = urllib.request.urlopen(req, timeout=60).read()
                im = Image.open(io.BytesIO(data)).convert('RGB')
                if im.width > 1200:
                    im = im.resize((1200, round(im.height * 1200 / im.width)), Image.LANCZOS)
                im.save(dest, 'WEBP', quality=78, method=6)
            except Exception as e:  # keep going; the article just shows without an image
                failed.append((slug, str(e)[:80]))
                continue
        out[slug] = '/' + dest.split('public/', 1)[1]
    json.dump(out, open(MAP, 'w'), indent=1)
    print(f'{len(out)} images, {len(failed)} failed')
    for f in failed:
        print('  failed:', *f, file=sys.stderr)

if __name__ == '__main__':
    main()
