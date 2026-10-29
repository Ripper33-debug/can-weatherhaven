"""Image + font pipeline: resizes Weatherhaven photos to WebP with content hashes, writes src/generated/img.json.
Usage: python3 scripts/images.py <imgdir> [<imgdir> ...]"""
import base64, hashlib, json, os, re, sys
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OLD = '/home/claude/weatherhaven-redesign'
sys.path.insert(0, OLD); sys.argv = [sys.argv[0]] + sys.argv[1:]
import build as B
B.IMGDIRS = sys.argv[1:]
OUT = os.path.join(ROOT, 'public', 'assets')
def h(b): return hashlib.sha256(b).hexdigest()[:10]
def put(rel, data):
    p = os.path.join(OUT, rel); os.makedirs(os.path.dirname(p), exist_ok=True); open(p, 'wb').write(data); return '/assets/' + rel
imgs = {}
for k, uri in B.logos().items():
    d = base64.b64decode(uri.split(',', 1)[1]); imgs[k] = put(f'img/{k}.{h(d)}.png', d)
total = 0
for k, (fn, w, q) in B.IMAGES.items():
    uri = B.webp(B.find(fn), w, q, raw=k in ('hqss_diag', 'plan_3d'))
    d = base64.b64decode(uri.split(',', 1)[1]); total += len(d); imgs[k] = put(f'img/{k}.{h(d)}.webp', d)
# posters for the lazy 3D stages (reuse hero photos) are just keys in the map
fonts_css = open(os.path.join(OLD, 'src', 'fonts_embedded.css'), encoding='utf-8').read(); n = [0]
def font(m):
    d = base64.b64decode(m.group(1)); n[0] += 1; return f"url(/assets/fonts/font{n[0]}.{h(d)}.woff2)" if put(f'fonts/font{n[0]}.{h(d)}.woff2', d) else ''
fonts_css = re.sub(r'url\(data:font/woff2;base64,([A-Za-z0-9+/=]+)\)', font, fonts_css)
open(os.path.join(ROOT, 'src', 'styles', 'fonts.css'), 'w', encoding='utf-8').write(fonts_css)
json.dump(imgs, open(os.path.join(ROOT, 'src', 'generated', 'img.json'), 'w'), indent=0)
json.dump(B.IMGPOS, open(os.path.join(ROOT, 'src', 'generated', 'imgpos.json'), 'w'))
print(len(imgs), 'images', round(total / 1e6, 2), 'MB;', n[0], 'fonts')
