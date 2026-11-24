#!/usr/bin/env python3
"""640px copies of the site images for thumbnails and small cards (gallery thumbnails, product lineup, related
cards, news cards), so a 1400px photo isn't downloaded to fill an 88px box. Writes src/generated/img-sm.json
(full path -> small path). Run after images.py / news_images.py: python3 scripts/thumbs.py"""
import hashlib, io, json, os
from PIL import Image
W = 640
paths = list(json.load(open('src/generated/img.json')).values()) + list(json.load(open('src/generated/news-img.json')).values())
out, saved = {}, 0
for path in paths:
    if not path.endswith('.webp'): continue
    src = 'public' + path; im = Image.open(src)
    if im.width <= W + 80: continue
    small = im.convert('RGB').resize((W, round(im.height * W / im.width)), Image.LANCZOS)
    buf = io.BytesIO(); small.save(buf, 'WEBP', quality=76, method=6); data = buf.getvalue()
    d, name = os.path.split(path); stem = name.split('.')[0]
    # hashed names in /assets/img are cached forever, so the small copy gets its own content hash
    new = f'{d}/{stem}-{W}.{hashlib.sha1(data).hexdigest()[:10]}.webp' if d.endswith('/img') else f'{d}/{stem}-{W}.webp'
    for old in [f for f in os.listdir('public' + d) if f.startswith(f'{stem}-{W}.')]:
        if 'public' + d + '/' + old != 'public' + new: os.remove('public' + d + '/' + old)
    open('public' + new, 'wb').write(data)
    out[path] = new; saved += os.path.getsize(src) - len(data)
json.dump(out, open('src/generated/img-sm.json', 'w'), indent=1)
print(f'{len(out)} small copies, {saved / 1e6:.1f} MB lighter where used')
