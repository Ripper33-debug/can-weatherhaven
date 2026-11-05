#!/usr/bin/env python3
"""Refresh src/content/sites.json from Weatherhaven's public deployment map (Google My Maps).

The map's KML carries each site's name, type and address; the map viewer page carries the
positions Google geocoded for those addresses. Run:  python3 scripts/sites.py
"""
import html, json, re, sys, urllib.request
import xml.etree.ElementTree as ET

MID = '1WjBWwEmcEb7M-4sl1pXu_b3MwyBTUm96'
OUT = 'src/content/sites.json'
TYPES = {'Defence/Peacekeeping': 'def', 'Medical/Disaster Relief': 'med', 'Commercial/Scientific': 'com'}
TYPOS = {'Gemany': 'Germany', 'Brasilla': 'Brasília', 'Megadan': 'Magadan', 'Svaldbard': 'Svalbard', 'Atquasuk': 'Atqasuk', 'Zucchelli,': 'Zucchelli Station,'}
# placemarks with no usable name/position in the source map
MANUAL = {('Commercial/Scientific', 'Commercial/Scientific'): ('Antarctica', -74.694, 164.112)}

def get(url):
    return urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'}), timeout=60).read().decode('utf-8', 'ignore')

def norm(x):
    return re.sub(r'\s+', ' ', html.unescape(x)).strip().lower()

def main():
    ns = {'k': 'http://www.opengis.net/kml/2.2'}
    doc = ET.fromstring(get(f'https://www.google.com/maps/d/kml?mid={MID}&forcekml=1')).find('k:Document', ns)
    pins = []
    for pm in doc.iter('{http://www.opengis.net/kml/2.2}Placemark'):
        desc = re.sub(r'<[^>]+>', '\n', pm.findtext('k:description', default='', namespaces=ns))
        typ = desc.strip().split('\n')[0].strip()
        loc = (pm.findtext('.//k:Data[@name="Location"]/k:value', default='', namespaces=ns) or pm.findtext('k:address', default='', namespaces=ns)).strip()
        pins.append((typ, pm.findtext('k:name', default='', namespaces=ns), loc))
    page = get(f'https://www.google.com/maps/d/viewer?mid={MID}')
    i = page.find('_pageData = "'); j = page.find('";', i)
    raw = page[i + 13:j]
    try: data = json.loads('"' + raw + '"')  # the page data is a JSON-escaped string
    except ValueError: data = raw.encode('latin-1', 'ignore').decode('unicode_escape').replace('\\"', '"')
    data = data.replace('\\u0026', '&').replace('\\"', '"')
    heads = [(m.start(), m.group(1)) for m in re.finditer(r'\[\["(' + '|'.join(map(re.escape, TYPES)) + r')"\]\]', data)]
    pat = re.compile(r'\[\[\],null,1,1,\[\[null,\[(-?[\d.]+),(-?[\d.]+)\]\],"0",null,"[^"]*",\[[^\]]*\],\[0,0\],"([0-9A-F]+)"\],\[\["((?:[^"\\]|\\.)*)"\]\]\]')
    geo = []
    for k, (pos, typ) in enumerate(heads):
        end = heads[k + 1][0] if k + 1 < len(heads) else len(data)
        geo += [[typ, m.group(4), float(m.group(1)), float(m.group(2)), False] for m in pat.finditer(data, pos, end)]
    out, missing = [], []
    for typ, name, loc in pins:
        if (typ, name) in MANUAL:
            label, lat, lon = MANUAL[(typ, name)]
        else:
            g = next((g for g in geo if g[0] == typ and norm(g[1]) == norm(name) and not g[4]), None)
            if not g: missing.append((typ, name, loc)); continue
            g[4] = True; label, lat, lon = re.sub(r'\s+', ' ', name).strip(), g[2], g[3]
        for a, b in TYPOS.items(): label = label.replace(a, b); loc = loc.replace(a, b)
        if re.match(r'^-?\d+\.\d+,\s*-?\d+\.\d+$', loc): loc = re.sub(r'\s*\(.*\)', '', label).strip()
        out.append({'c': label, 't': TYPES[typ], 'loc': loc, 'lat': round(lat, 3), 'lon': round(lon, 3)})
    json.dump(out, open(OUT, 'w'), ensure_ascii=False, separators=(',', ':'))
    print(f'{len(out)} sites written to {OUT}')
    if missing: print('No position found for:', missing, file=sys.stderr)

if __name__ == '__main__':
    main()
