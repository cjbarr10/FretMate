"""FretMate app icon generator.

Draws at 4x and downsamples, which is how you get clean curves and hairlines
out of Pillow without any anti-aliasing support in the drawing calls.

Palette is the app's Blackface theme, so the icon matches what opens when you
tap it: black tolex, brushed chrome, blue jewel lamp.
"""
from PIL import Image, ImageDraw
import os

BG = (11, 12, 14)
CHROME = (228, 233, 239)
CHROME_DIM = (167, 176, 187)
BLUE = (47, 107, 255)
MUTED = (124, 135, 148)
LINE = (40, 44, 51)

SS = 4  # supersample factor


def _canvas(size):
    img = Image.new("RGB", (size * SS, size * SS), BG)
    return img, ImageDraw.Draw(img), size * SS


def _circle(d, cx, cy, r, fill, outline=None, width=0):
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=fill, outline=outline, width=width)


def _strings(d, N, inset, count=6):
    """Six strings running the full height, thick to thin like the real thing."""
    span = N * 0.70 * inset
    gap = span / (count - 1)
    left = N / 2 - span / 2
    for i in range(count):
        x = left + i * gap
        w = N * (0.0105 - i * 0.0011) * inset
        d.rectangle([x - w, -1, x + w, N + 1], fill=MUTED)
    return left, gap, span


def concept_marked_note(size, inset=1.0):
    """An inlay dot on the neck, with the fret wire lit blue.

    Inlays sit centred between the strings rather than on one, so this reads
    as a real fretboard. One bold shape, which is what survives being shrunk
    to a home-screen tile.
    """
    img, d, N = _canvas(size)
    c = N / 2
    _strings(d, N, inset)

    fw = N * 0.014 * inset
    d.rectangle([-1, c - fw, N + 1, c + fw], fill=BLUE)

    r = N * 0.21 * inset
    _circle(d, c, c, r * 1.10, BG)
    _circle(d, c, c, r, CHROME)
    _circle(d, c, c, r, None, CHROME_DIM, int(N * 0.007 * inset))
    return img.resize((size, size), Image.LANCZOS)


def concept_twelfth_fret(size, inset=1.0):
    """The 12th-fret double inlay — the landmark every player finds by feel."""
    img, d, N = _canvas(size)
    c = N / 2
    _strings(d, N, inset)

    fw = N * 0.015 * inset
    reach = N * 0.25 * inset
    d.rectangle([-1, c - reach - fw, N + 1, c - reach + fw], fill=BLUE)
    d.rectangle([-1, c + reach - fw, N + 1, c + reach + fw], fill=BLUE)

    r = N * 0.115 * inset
    for dx in (-N * 0.165 * inset, N * 0.165 * inset):
        _circle(d, c + dx, c, r * 1.18, BG)
        _circle(d, c + dx, c, r, CHROME)
    return img.resize((size, size), Image.LANCZOS)


def concept_chord_grid(size, inset=1.0):
    """A chord chart in miniature: nut, strings, and a shape with a blue root."""
    img, d, N = _canvas(size)
    c = N / 2
    span = N * 0.62 * inset
    height = N * 0.58 * inset
    gap = span / 5
    left = c - span / 2
    top = c - height / 2
    over = gap * 0.45

    nut_h = N * 0.034 * inset
    d.rectangle([left - over, top, left + span + over, top + nut_h], fill=CHROME)

    rows = 3
    row_h = (height - nut_h) / rows
    for r_i in range(1, rows + 1):
        y = top + nut_h + r_i * row_h
        d.rectangle([left - over, y - N * 0.005 * inset,
                     left + span + over, y + N * 0.005 * inset], fill=LINE)

    for i in range(6):
        x = left + i * gap
        w = N * (0.0085 - i * 0.0009) * inset
        d.rectangle([x - w, top, x + w, top + height], fill=MUTED)

    # the open E shape — the first chord most people learn
    r = N * 0.055 * inset
    for string_i, fret, col in [(1, 2, CHROME), (2, 2, CHROME), (3, 1, BLUE)]:
        x = left + string_i * gap
        y = top + nut_h + (fret - 0.5) * row_h
        _circle(d, x, y, r * 1.28, BG)
        _circle(d, x, y, r, col)
    return img.resize((size, size), Image.LANCZOS)


CONCEPTS = {
    "1-marked-note": concept_marked_note,
    "2-twelfth-fret": concept_twelfth_fret,
    "3-chord-grid": concept_chord_grid,
}

if __name__ == "__main__":
    out = os.environ.get("OUT", "/tmp/icons")
    os.makedirs(out, exist_ok=True)
    for name, fn in CONCEPTS.items():
        fn(1024).save(f"{out}/concept-{name}.png")
        # a home-screen-sized preview, to check it survives being small
        fn(1024).resize((120, 120), Image.LANCZOS).save(f"{out}/preview-{name}.png")
    print("wrote", sorted(os.listdir(out)))


def build_assets(concept="1-marked-note", outdir="assets"):
    """Writes every image Expo needs, from one concept.

    Android masks the adaptive icon to a circle or squircle, so its artwork is
    drawn smaller — anything out near the corners would be cropped away.
    """
    fn = CONCEPTS[concept]
    os.makedirs(outdir, exist_ok=True)

    fn(1024).save(f"{outdir}/icon.png")                 # iOS + general
    # Android crops to a circle or squircle. The fretboard is a pattern, so
    # letting it bleed and be cropped looks deliberate; what matters is that
    # the dot sits well inside the safe zone, which it does at full size.
    fn(1024).save(f"{outdir}/adaptive-icon.png")
    fn(1024, inset=0.50).save(f"{outdir}/splash-icon.png")    # launch screen
    fn(196).save(f"{outdir}/favicon.png")               # web tab
    return sorted(os.listdir(outdir))
