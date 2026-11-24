#!/usr/bin/env python3
"""Dotted world map (from the globe's land mask, src/generated/land.b64) for the sector pages' deployment maps.
Equirectangular, latitude 82°N to 60°S (Antarctic sites are pinned to the bottom edge). Writes
public/assets/img/world-dots.webp. Run: python3 scripts/world_map.py"""
import base64, struct
from PIL import Image, ImageDraw
W, H, LAT0, LAT1 = 2000, 900, 82.0, -60.0
raw = base64.b64decode(open('src/generated/land.b64').read().strip())
vals = struct.unpack('<%dh' % (len(raw) // 2), raw)
im = Image.new('RGBA', (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
n = 0
for i in range(0, len(vals), 2):
    lat, lon = vals[i] / 10, vals[i + 1] / 10
    if lat < LAT1 - 2: continue
    x = (lon + 180) / 360 * W; y = (LAT0 - lat) / (LAT0 - LAT1) * H; r = 3.1
    d.ellipse((x - r, y - r, x + r, y + r), fill=(141, 179, 218, 120)); n += 1
im.save('public/assets/img/world-dots.webp', 'WEBP', quality=82, method=6)
print(n, 'land dots')
