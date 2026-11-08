"""Arashi Academy logo generator.
Writes SVGs (text converted to outlines, no font needed) into assets/brand/:
  arashi-mark.svg      storm swirl only, transparent background
  arashi-badge.svg     round patch with ARASHI / ACADEMY ring text (profile picture, crests)
  arashi-lockup.svg    mark + wordmark side by side (site header, banners)
  arashi-wordmark.svg  wordmark only
Run: python3 tools/logo.py <fonts dir with shippori-mincho-b1-latin-800-normal.woff2 and zen-kaku-gothic-new-latin-700-normal.woff2>
"""
import math, os, sys, random
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen

RED, PAPER, INK = '#B3121B', '#EDE6DA', '#0B0A0A'
FD = sys.argv[1] if len(sys.argv) > 1 else '.'
OUT = os.path.join(os.path.dirname(__file__), '..', 'assets', 'brand'); os.makedirs(OUT, exist_ok=True)
DISP = TTFont(os.path.join(FD, 'shippori-mincho-b1-latin-800-normal.woff2'))
UI = TTFont(os.path.join(FD, 'zen-kaku-gothic-new-latin-700-normal.woff2'))
P = lambda a, r, cx=0, cy=0: (cx + r * math.cos(a), cy + r * math.sin(a))
f = lambda v: f'{v:.2f}'


# ---------- storm swirl ----------
def arm_points(k, R=100, arms=3, turns=1.05, seed=3):
    """One blade of the storm: thin at the eye, widening outward, torn flame barbs on the outer edge
    that rise slowly and break off sharply, ending in a sharp swept tip."""
    rot = k * 2 * math.pi / arms
    N = 260
    th_of = lambda t: rot + t * turns * 2 * math.pi
    r_of = lambda t: R * (.05 + .83 * t ** 1.1)
    w_of = lambda t: R * (.02 + .2 * math.sin(math.pi * min(t, .93) / 1.86) ** 1.3) * (1 - max(0, t - .8) / .2) ** .8
    barbs = [(.38, .05), (.52, .06), (.64, .07), (.76, .08), (.87, .085)]
    outer, inner = [], []
    for i in range(N + 1):
        t = i / N; th, r, w = th_of(t), r_of(t), w_of(t)
        bump = 0
        for c, dep in barbs:
            u = (t - c) / .065
            if -1 < u <= 0: bump = max(bump, dep * R * (1 + u) ** 1.6)
            if 0 < u < .12: bump = max(bump, dep * R * (1 - u / .12) ** 2)
        outer.append(P(th + bump / max(r, 1) * .25, r + w * .5 + bump))
        inner.append(P(th, max(0, r - w * .5)))
    return outer + [P(th_of(1) + .12, r_of(1) + .02 * R)] + inner[::-1]


def swirl_path(R=100, cx=0, cy=0):
    d = []
    for k in range(3):
        pts = arm_points(k, R)
        d.append('M' + ' L'.join(f'{f(cx + x)},{f(cy + y)}' for x, y in pts) + 'Z')
    return ' '.join(d)


def swirl_svg(R, cx, cy, outline):
    d = swirl_path(R, cx, cy)
    return (f'<path d="{d}" fill="{PAPER}" stroke="{PAPER}" stroke-width="{f(outline * 2)}" stroke-linejoin="miter" stroke-miterlimit="3"/>'
            f'<path d="{d}" fill="{RED}"/>')


# ---------- text to outlines ----------
def glyph_path(font, ch, size, x, y, rot=0, ox=0):
    """Outline of one glyph at (x,y) baseline-center, rotated rot radians. Returns (path, advance)."""
    gs = font.getGlyphSet(); cmap = font.getBestCmap(); gn = cmap[ord(ch)]
    upm = font['head'].unitsPerEm; s = size / upm; adv = gs[gn].width * s
    c, sn = math.cos(rot), math.sin(rot)
    # glyph space -> centered on its advance, y flipped, rotated, translated
    tr = (s * c, s * sn, s * sn, -s * c, x - (adv / 2 + ox) * c, y - (adv / 2 + ox) * sn)
    pen = SVGPathPen(gs); gs[gn].draw(TransformPen(pen, tr))
    return pen.getCommands(), adv


def text_line(font, text, size, cx, y, track=0):
    gs = font.getGlyphSet(); cmap = font.getBestCmap(); s = size / font['head'].unitsPerEm
    advs = [gs[cmap[ord(ch)]].width * s + track for ch in text]; total = sum(advs) - track
    x = cx - total / 2; parts = []
    for ch, a in zip(text, advs):
        if ch != ' ': parts.append(glyph_path(font, ch, size, x + (a - track) / 2, y)[0])
        x += a
    return ' '.join(parts), total


def text_arc(font, text, size, cx, cy, r, center_angle, track, bottom=False):
    """Letters on a circle; top text reads clockwise, bottom text reads left-to-right too."""
    gs = font.getGlyphSet(); cmap = font.getBestCmap(); s = size / font['head'].unitsPerEm
    advs = [gs[cmap[ord(ch)]].width * s + track for ch in text]; total = sum(advs) - track
    span = total / r; parts = []
    a = center_angle - span / 2 if not bottom else center_angle + span / 2
    for ch, adv in zip(text, advs):
        da = adv / r; mid = a + (da - track / r) / 2 * (1 if not bottom else -1)
        if ch != ' ':
            if not bottom:
                x, y = P(mid, r, cx, cy); parts.append(glyph_path(font, ch, size, x, y, mid + math.pi / 2)[0])
            else:
                x, y = P(mid, r, cx, cy); parts.append(glyph_path(font, ch, size, x, y, mid - math.pi / 2)[0])
        a += da if not bottom else -da
    return ' '.join(parts)


def svg(w, h, body, bg=None):
    b = f'<rect width="{w}" height="{h}" fill="{bg}"/>' if bg else ''
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="{w}" height="{h}">{b}{body}</svg>\n'


def stitches(cx, cy, r, n, sw):
    out = []
    for i in range(n):
        a = i / n * 2 * math.pi
        x1, y1 = P(a, r - sw, cx, cy); x2, y2 = P(a + .6 / n * 2 * math.pi * .5, r + sw, cx, cy)
        out.append(f'M{f(x1)},{f(y1)} L{f(x2)},{f(y2)}')
    return f'<path d="{" ".join(out)}" stroke="{PAPER}" stroke-opacity=".55" stroke-width="{f(sw * .55)}" stroke-linecap="round" fill="none"/>'


# 1) mark
mark = svg(240, 240, f'<circle cx="120" cy="120" r="118" fill="{INK}"/>' + swirl_svg(100, 120, 120, 4.2))
open(os.path.join(OUT, 'arashi-mark.svg'), 'w').write(mark)

# 2) badge (profile picture / crest)
C = 540
ring_top = text_arc(DISP, 'ARASHI', 92, C, C, 404, -math.pi / 2, 30)
ring_bot = text_arc(UI, 'ACADEMY', 54, C, C, 418, math.pi / 2, 26, bottom=True)
dots = ''.join(f'<circle cx="{f(P(a, 400, C, C)[0])}" cy="{f(P(a, 400, C, C)[1])}" r="9" fill="{RED}"/>' for a in (math.pi * .02, math.pi * .98))
badge = (f'<circle cx="{C}" cy="{C}" r="{C}" fill="{INK}"/>'
         f'<circle cx="{C}" cy="{C}" r="500" fill="none" stroke="{PAPER}" stroke-width="6"/>'
         + stitches(C, C, 482, 120, 7) +
         f'<circle cx="{C}" cy="{C}" r="322" fill="none" stroke="{PAPER}" stroke-width="5"/>'
         f'<path d="{ring_top}" fill="{PAPER}"/><path d="{ring_bot}" fill="{PAPER}"/>' + dots
         + swirl_svg(292, C, C, 9))
open(os.path.join(OUT, 'arashi-badge.svg'), 'w').write(svg(1080, 1080, badge))

# 3) wordmark + lockup
wm1, w1 = text_line(DISP, 'ARASHI', 120, 0, 0, 22)
wm2, w2 = text_line(UI, 'ACADEMY', 40, 0, 0, 30)
def wordmark(x, y, scale=1):
    return (f'<g transform="translate({f(x)},{f(y)}) scale({scale})"><path d="{wm1}" fill="{PAPER}"/>'
            f'<rect x="{f(-w1 / 2)}" y="24" width="{f(w1)}" height="4" fill="{RED}"/>'
            f'<g transform="translate(0,84)"><path d="{wm2}" fill="{PAPER}"/></g></g>')
open(os.path.join(OUT, 'arashi-wordmark.svg'), 'w').write(svg(int(w1 + 40), 200, wordmark(w1 / 2 + 20, 120)))
LW = int(260 + w1 + 40)
lock = f'<circle cx="120" cy="120" r="118" fill="{INK}"/>' + swirl_svg(100, 120, 120, 4.2) + wordmark(260 + w1 / 2, 132)
open(os.path.join(OUT, 'arashi-lockup.svg'), 'w').write(svg(LW, 240, lock))
print('ok', OUT)
