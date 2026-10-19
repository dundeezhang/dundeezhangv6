"""Prepare smooth signature contours and matching EB Garamond glyphs.

Asset generation only; the website has no Python dependency.
Requires pillow, numpy, scipy, scikit-image, fonttools, brotli.
Run after starting Next (for its downloaded Garamond font):
  python scripts/trace-signature.py /tmp/signature-rings.json
  bun scripts/build-signature.ts /tmp/signature-rings.json
"""

import json
import math
import sys
from pathlib import Path

import numpy as np
from PIL import Image
from scipy.ndimage import gaussian_filter, label
from scipy.interpolate import splprep, splev
from skimage.measure import find_contours
from fontTools.ttLib import TTFont
from fontTools.pens.basePen import BasePen

ROOT = Path(__file__).resolve().parent.parent
WIDTH, HEIGHT = 1324, 463
TEXT = "Dundee Zhang"


def area(points):
    p = np.array(points)
    return float(np.sum(p[:, 0] * np.roll(p[:, 1], -1) - p[:, 1] * np.roll(p[:, 0], -1)) / 2)


def classify(rings):
    rings = sorted(rings, key=lambda r: abs(area(r)), reverse=True)
    sign = np.sign(area(rings[0]))
    return {"outer": [r for r in rings if np.sign(area(r)) == sign], "holes": [r for r in rings if np.sign(area(r)) != sign]}


class OutlinePen(BasePen):
    def __init__(self, glyph_set):
        super().__init__(glyph_set)
        self.rings = []
        self.points = []

    def _moveTo(self, p):
        self.points = [p]

    def _lineTo(self, p):
        self.points.append(p)

    def _qCurveToOne(self, control, end):
        start = self.points[-1]
        steps = max(3, math.ceil((math.dist(start, control) + math.dist(control, end)) / 8))
        for t in np.linspace(0, 1, steps + 1)[1:]:
            self.points.append(tuple((1 - t) ** 2 * np.array(start) + 2 * (1 - t) * t * np.array(control) + t ** 2 * np.array(end)))

    def _curveToOne(self, c1, c2, end):
        start = self.points[-1]
        steps = max(3, math.ceil((math.dist(start, c1) + math.dist(c1, c2) + math.dist(c2, end)) / 8))
        for t in np.linspace(0, 1, steps + 1)[1:]:
            self.points.append(tuple((1 - t) ** 3 * np.array(start) + 3 * (1 - t) ** 2 * t * np.array(c1) + 3 * (1 - t) * t ** 2 * np.array(c2) + t ** 3 * np.array(end)))

    def _closePath(self):
        if len(self.points) > 2:
            self.rings.append(self.points)
        self.points = []

    def _endPath(self):
        self._closePath()


def kerning(font, left, right):
    if not left or not right:
        return 0
    gpos = font["GPOS"].table
    indices = {index for feature in gpos.FeatureList.FeatureRecord if feature.FeatureTag == "kern" for index in feature.Feature.LookupListIndex}
    advance = 0
    for index in indices:
        lookup = gpos.LookupList.Lookup[index]
        for sub in lookup.SubTable:
            if lookup.LookupType == 9:
                sub = sub.ExtSubTable
            if not hasattr(sub, "Coverage") or left not in sub.Coverage.glyphs:
                continue
            value = None
            if sub.Format == 1:
                pair_set = sub.PairSet[sub.Coverage.glyphs.index(left)]
                value = next((pair.Value1 for pair in pair_set.PairValueRecord if pair.SecondGlyph == right), None)
            elif sub.Format == 2:
                c1 = sub.ClassDef1.classDefs.get(left, 0)
                c2 = sub.ClassDef2.classDefs.get(right, 0)
                value = sub.Class1Record[c1].Class2Record[c2].Value1
            if value:
                advance += getattr(value, "XAdvance", 0)
    return advance


image = Image.open(ROOT / "src/assets/signature-source.png").convert("L").crop((73, 85, 1397, 548))
ink = np.asarray(image) < 128
components, count = label(ink)
component_boxes = []
for component in range(1, count + 1):
    ys, xs = np.nonzero(components == component)
    if len(xs) > 10:
        component_boxes.append((component, int(xs.min()), int(xs.max()), int(ys.min()), int(ys.max())))

# Keep the original pen shapes; split only the connected d/e/e at their joins.
regions = [(0, 310), (310, 378), (378, 450), (450, 553), (553, 616), (616, 705), (745, 1040), (998, 1104), (1100, 1161), (1161, 1234), (1234, 1324)]
letters = list("DundeeZhang")
source_rings = []
for i, (lo, hi) in enumerate(regions):
    mask = np.zeros_like(ink)
    if i < 6:
        mask[:, lo:hi] = ink[:, lo:hi]
    else:
        # Z and h overlap horizontally but are separate ink components.
        matches = [box for box in component_boxes if (i == 6 and box[1] < 900 and box[2] > 1000) or (i == 7 and 995 < box[1] < 1030 and box[3] < 100) or (i > 7 and lo <= (box[1] + box[2]) / 2 < hi)]
        for component, *_ in matches:
            mask |= components == component
    softened = gaussian_filter(mask.astype(float), 1.1)
    contours = find_contours(softened, 0.42)
    rings = []
    for contour in contours:
        if len(contour) < 12:
            continue
        points = contour[:, [1, 0]]
        if abs(area(points)) < 5:
            continue
        spline, _ = splprep(points.T, s=len(points) * 1.7, per=True)
        length = np.linalg.norm(np.diff(points, axis=0), axis=1).sum()
        points = np.array(splev(np.linspace(0, 1, max(16, round(length / 3)), endpoint=False), spline)).T
        rings.append(points.round(3).tolist())
    if not rings:
        raise RuntimeError(f"No contours for {letters[i]}")
    source_rings.append(classify(rings))

font_path = None
for candidate in (ROOT / ".next").glob("**/*.woff2"):
    try:
        font = TTFont(candidate)
        family = font["name"].getDebugName(1) or ""
        if "Garamond" in family and not font["head"].macStyle & 2 and all(ord(c) in font.getBestCmap() for c in TEXT):
            font_path = candidate
            break
    except Exception:
        continue
if font_path is None:
    raise RuntimeError("Start Next first so its EB Garamond font is available.")

font = TTFont(font_path)
glyphs = font.getGlyphSet(location={"wght": 400})
cmap = font.getBestCmap()
cursor = 0
previous = None
target_rings = []
for character in TEXT:
    glyph_name = cmap[ord(character)]
    cursor += kerning(font, previous, glyph_name)
    if character != " ":
        pen = OutlinePen(glyphs)
        glyphs[glyph_name].draw(pen)
        target_rings.append([[[float(x + cursor), float(-y)] for x, y in ring] for ring in pen.rings])
    cursor += font["hmtx"][glyph_name][0] - 55
    previous = glyph_name

all_points = np.array([point for rings in target_rings for ring in rings for point in ring])
minimum, maximum = all_points.min(axis=0), all_points.max(axis=0)
span = maximum - minimum
targets = []
for rings in target_rings:
    normalized = [((np.array(ring) - minimum) / span * [WIDTH, HEIGHT]).round(3).tolist() for ring in rings]
    targets.append(classify(normalized))

data = {"width": WIDTH, "height": HEIGHT, "font": {"unitsPerEm": font["head"].unitsPerEm, "ascent": font["hhea"].ascent, "descent": -font["hhea"].descent, "inkBounds": [*minimum.tolist(), *span.tolist()]}, "letters": [{"name": name, "from": source, "to": target} for name, source, target in zip(letters, source_rings, targets)]}
Path(sys.argv[1]).write_text(json.dumps(data, separators=(",", ":")))
print(f"Prepared {len(letters)} smooth letters using {font_path.name}")
