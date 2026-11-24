#!/usr/bin/env python3
"""Link-preview images: 1200x630 JPGs (some apps don't show WebP previews) for the images pages use as their
og:image (products, sectors, detail pages, news). Writes public/assets/og/<key>.jpg and src/generated/og.json.
Run after images.py / news_images.py: python3 scripts/og_images.py"""
import json, os
from PIL import Image, ImageOps
IMG = json.load(open('src/generated/img.json')); NEWS = json.load(open('src/generated/news-img.json'))
keys = {p['imgs'][0] for p in json.load(open('src/content/products.json'))}
for k, s in json.load(open('src/content/sectors.json')).items():
    keys.add(s['img']); keys.update(a['img'] for a in s['apps'])
for f in ('services', 'support', 'accessories'):
    keys.update(x['img'] for x in json.load(open(f'src/content/{f}.json')))
keys.add('rapid_forest')
src = {k: IMG[k] for k in keys if k in IMG}
src.update({'news-' + slug: path for slug, path in NEWS.items()})
os.makedirs('public/assets/og', exist_ok=True); out = {}
for k, path in sorted(src.items()):
    dest = f'public/assets/og/{k}.jpg'
    im = Image.open('public' + path).convert('RGB')
    ImageOps.fit(im, (1200, 630), Image.LANCZOS).save(dest, 'JPEG', quality=80, optimize=True, progressive=True)
    out[k] = '/' + dest.split('public/', 1)[1]
json.dump(out, open('src/generated/og.json', 'w'), indent=1)
print(f'{len(out)} preview images')
