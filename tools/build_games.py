"""Builds every game in games/games.json into dist/<id>.pdf.

Same idea as build.py (snake): the page is drawn once, and the game screen is
a stack of text fields, one per row, that the game's JavaScript rewrites. On
top of that, games can have invisible buttons over the screen ("click"
groups) so you can click squares directly.
"""
import json
import os

from build_site import build_site

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
GAMES_DIR = os.path.join(ROOT, "games")
DIST = os.path.join(ROOT, "dist")
WEB_GAMES = os.path.join(ROOT, "web", "games")

PORTFOLIO_URL = b"https://sanjith-portfolio-10.vercel.app/"


def rgb(hex_color):
    """'#ff6a3d' -> b'1.000 0.416 0.239' (PDF colors are 0-1, not 0-255)."""
    h = hex_color.lstrip("#")
    return b" ".join(b"%.3f" % (int(h[i:i + 2], 16) / 255) for i in (0, 2, 4))


def ink_for(hex_color):
    """Dark text on bright buttons, white text on dark ones."""
    h = hex_color.lstrip("#")
    r, g, b = (int(h[i:i + 2], 16) / 255 for i in (0, 2, 4))
    return rgb("#14161c") if 0.299 * r + 0.587 * g + 0.114 * b > 0.6 else WHITE


def darker(hex_color, amount=0.7):
    h = hex_color.lstrip("#")
    return "#" + "".join("%02x" % int(int(h[i:i + 2], 16) * amount) for i in (0, 2, 4))


# ---------------------------------------------------------------- theme
PAGE_BG = rgb("#0e0f13")
PANEL = rgb("#171a21")
PANEL_EDGE = rgb("#2a2f3a")
SHADOW = rgb("#050608")
SCREEN_BG = rgb("#111318")
TEXT = rgb("#e8eaf0")
MUTED = rgb("#8a90a0")
WHITE = rgb("#ffffff")

PAGE_W = 792
PAGE_H = 612

# ---------------------------------------------------------------- layout
SCREEN_LEFT = 40
SCREEN_RIGHT = 470
SCREEN_TOP = 500
SCREEN_BOTTOM = 100
SCREEN_CX = (SCREEN_LEFT + SCREEN_RIGHT) / 2

SIDE_LEFT = 520
SIDE_RIGHT = 752
SIDE_MID = (SIDE_LEFT + SIDE_RIGHT) // 2

SCORE_CARD = (SIDE_LEFT, 420, SIDE_RIGHT, SCREEN_TOP + 12)       # left, bottom, right, top
CONTROLS_CARD = (SIDE_LEFT, SCREEN_BOTTOM - 12, SIDE_RIGHT, 405)

BTN = 48            # arrow buttons
GAP = 8
ACTION_H = 28       # labelled buttons
KBD_H = 26
FIELD_PAD = 2       # how far viewers indent text inside a field

CREATOR_TEXT = b"Meet the creator ->"
CREATOR_Y = 552
CREATOR_RIGHT = SIDE_RIGHT
CREATOR_LEFT = CREATOR_RIGHT - len(CREATOR_TEXT) * 12 * 0.6


# ---------------------------------------------------------------- pdf objects
class Pdf:
    def __init__(self):
        self.bodies = {}
        self.count = 0

    def alloc(self):
        self.count += 1
        return self.count

    def add(self, num, body):
        self.bodies[num] = body

    def add_stream(self, num, data):
        self.add(num, b"<< /Length %d >>\nstream\n" % len(data) + data + b"\nendstream")

    def output(self, root):
        out = bytearray(b"%PDF-1.7\n%\xe2\xe3\xcf\xd3\n")
        offsets = {}
        for num in range(1, self.count + 1):
            offsets[num] = len(out)
            out += b"%d 0 obj\n" % num + self.bodies[num] + b"\nendobj\n"
        xref = len(out)
        out += b"xref\n0 %d\n0000000000 65535 f \n" % (self.count + 1)
        for num in range(1, self.count + 1):
            out += b"%010d 00000 n \n" % offsets[num]
        out += b"trailer\n<< /Size %d /Root %d 0 R >>\nstartxref\n%d\n%%%%EOF\n" % (self.count + 1, root, xref)
        return bytes(out)


def pdf_string(s):
    """Escapes text for a PDF (literal string)."""
    if isinstance(s, str):
        s = s.encode("latin-1")
    return s.replace(b"\\", b"\\\\").replace(b"(", b"\\(").replace(b")", b"\\)")


def js_action(code):
    return b"<< /S /JavaScript /JS (%s) >>" % pdf_string(code)


# ---------------------------------------------------------------- drawing helpers
def rounded_rect(left, bottom, right, top, r):
    k = r * 0.5523
    return (
        b"%.1f %.1f m " % (left + r, bottom) +
        b"%.1f %.1f l " % (right - r, bottom) +
        b"%.1f %.1f %.1f %.1f %.1f %.1f c " % (right - r + k, bottom, right, bottom + r - k, right, bottom + r) +
        b"%.1f %.1f l " % (right, top - r) +
        b"%.1f %.1f %.1f %.1f %.1f %.1f c " % (right, top - r + k, right - r + k, top, right - r, top) +
        b"%.1f %.1f l " % (left + r, top) +
        b"%.1f %.1f %.1f %.1f %.1f %.1f c " % (left + r - k, top, left, top - r + k, left, top - r) +
        b"%.1f %.1f l " % (left, bottom + r) +
        b"%.1f %.1f %.1f %.1f %.1f %.1f c h\n" % (left, bottom + r - k, left + r - k, bottom, left + r, bottom)
    )


def card(left, bottom, right, top, fill, edge=None, radius=10, shadow=4):
    d = b""
    if shadow:
        d += SHADOW + b" rg " + rounded_rect(left + shadow, bottom - shadow, right + shadow, top - shadow, radius) + b"f\n"
    d += fill + b" rg "
    if edge:
        d += edge + b" RG 1.5 w " + rounded_rect(left, bottom, right, top, radius) + b"B\n"
    else:
        d += rounded_rect(left, bottom, right, top, radius) + b"f\n"
    return d


def text(x, y, size, color, s, bold=False):
    font = b"/CourB" if bold else b"/Cour"
    return b"BT %s %d Tf %s rg %.1f %.1f Td (%s) Tj ET\n" % (font, size, color, x, y, pdf_string(s))


def centered_text(cx, y, size, color, s, bold=False):
    width = len(s) * size * 0.6
    return text(cx - width / 2, y, size, color, s, bold)


def arrow(direction, cx, cy):
    s = 11
    points = {
        "up":    [(cx, cy + s), (cx - s, cy - s * 0.7), (cx + s, cy - s * 0.7)],
        "down":  [(cx, cy - s), (cx - s, cy + s * 0.7), (cx + s, cy + s * 0.7)],
        "left":  [(cx - s, cy), (cx + s * 0.7, cy + s), (cx + s * 0.7, cy - s)],
        "right": [(cx + s, cy), (cx - s * 0.7, cy + s), (cx - s * 0.7, cy - s)],
    }[direction]
    (x1, y1), (x2, y2), (x3, y3) = points
    return b"%.1f %.1f m %.1f %.1f l %.1f %.1f l h f\n" % (x1, y1, x2, y2, x3, y3)


def pixel_icon(x, y, pattern, accent):
    """Little pixel-art logo: '#' = accent pixel, 'o' = light pixel."""
    size, step = 7, 9
    d = b""
    for row, line in enumerate(pattern):
        for col, ch in enumerate(line):
            if ch == ".":
                continue
            d += (accent if ch == "#" else TEXT) + b" rg %.1f %.1f %d %d re f\n" % (
                x + col * step, y + (len(pattern) - 1 - row) * step, size, size)
    return d


def raised_button(left, bottom, right, top, accent, accent_dark, radius=8):
    return (accent_dark + b" rg " + rounded_rect(left, bottom - 4, right, top - 4, radius) + b"f\n" +
            accent + b" rg " + rounded_rect(left, bottom, right, top, radius) + b"f\n")


# ---------------------------------------------------------------- one game
def build(spec):
    pdf = Pdf()
    accent = rgb(spec["accent"])
    accent_dark = rgb(darker(spec["accent"]))
    ink = ink_for(spec["accent"])
    rows, cols = spec["rows"], spec["cols"]

    # Size the text so `cols` characters fit across and `rows` lines fit down.
    row_h = min(24.0, (SCREEN_TOP - SCREEN_BOTTOM) / rows)
    # Leave ~20pt spare each side: some viewers' Courier is a few percent
    # wider, and a row that overflows its field gets wrapped and cut off.
    font = min(row_h * 0.82, (SCREEN_RIGHT - SCREEN_LEFT - 40) / (cols * 0.6))
    font = int(font * 10) / 10
    char_w = font * 0.6
    rows_top = (SCREEN_TOP + SCREEN_BOTTOM) / 2 + rows * row_h / 2
    text_left = SCREEN_CX - cols * char_w / 2      # the text block is centered on the screen

    CATALOG = pdf.alloc()
    PAGES = pdf.alloc()
    PAGE = pdf.alloc()
    FONT = pdf.alloc()
    FONT_BOLD = pdf.alloc()
    CONTENT = pdf.alloc()
    JS_NAMES = pdf.alloc()
    JS_ACTION = pdf.alloc()
    JS_CODE = pdf.alloc()
    LINK = pdf.alloc()

    fields = []          # (num, body) in drawing order; later = on top
    content = b""
    FONTS_REF = b"<< /Cour %d 0 R /CourB %d 0 R >>" % (FONT, FONT_BOLD)

    def text_field(name, rect, da, value=b"", align=0, extra=b""):
        num = pdf.alloc()
        pdf.add(num, b"<< /Type /Annot /Subtype /Widget /FT /Tx /T (%s) /Rect [%.1f %.1f %.1f %.1f] /P %d 0 R /F 4 /Ff 1 /Q %d /DA (%s) /V (%s) %s>>" % (
            name, rect[0], rect[1], rect[2], rect[3], PAGE, align, da, pdf_string(value), extra))
        fields.append(num)
        return num

    def push_button(name, rect, code, highlight=b"/P"):
        num = pdf.alloc()
        pdf.add(num, b"<< /Type /Annot /Subtype /Widget /FT /Btn /Ff 65536 /T (%s) /Rect [%.1f %.1f %.1f %.1f] /P %d 0 R /F 4 /H %s /A %s >>" % (
            name, rect[0], rect[1], rect[2], rect[3], PAGE, highlight, js_action(code)))
        fields.append(num)
        return num

    # -------------------------------------------------------------- page art
    content += PAGE_BG + b" rg 0 0 %d %d re f\n" % (PAGE_W, PAGE_H)
    content += accent + b" rg 0 %d %d 4 re f\n" % (PAGE_H - 4, PAGE_W)
    icon = spec["icon"]
    content += pixel_icon(SCREEN_LEFT, 544, icon, accent)
    title_x = SCREEN_LEFT + max(len(line) for line in icon) * 9 + 16
    content += text(title_x, 546, 34, accent, spec["title"].encode(), bold=True)
    content += text(CREATOR_LEFT, CREATOR_Y, 12, accent, CREATOR_TEXT, bold=True)
    content += accent + b" RG 1 w %.1f %.1f m %.1f %.1f l S\n" % (CREATOR_LEFT, CREATOR_Y - 4, CREATOR_RIGHT, CREATOR_Y - 4)

    # Console bezel and screen
    content += card(SCREEN_LEFT - 14, SCREEN_BOTTOM - 12, SCREEN_RIGHT + 14, SCREEN_TOP + 12, PANEL, edge=accent, radius=14, shadow=6)
    content += SCREEN_BG + b" rg %d %d %d %d re f\n" % (SCREEN_LEFT, SCREEN_BOTTOM, SCREEN_RIGHT - SCREEN_LEFT, SCREEN_TOP - SCREEN_BOTTOM)

    # Score card
    sl, sb, sr, st = SCORE_CARD
    labels = spec.get("labels", ["SCORE", "BEST"])
    content += card(sl, sb, sr, st, PANEL, edge=PANEL_EDGE)
    content += centered_text((sl + SIDE_MID) / 2, st - 26, 11, MUTED, labels[0].encode())
    content += centered_text((SIDE_MID + sr) / 2, st - 26, 11, MUTED, labels[1].encode())
    content += PANEL_EDGE + b" RG 1 w %d %d m %d %d l S\n" % (SIDE_MID, sb + 14, SIDE_MID, st - 14)

    # Controls card, filled top to bottom
    cl, cb, cr, ct = CONTROLS_CARD
    content += card(cl, cb, cr, ct, PANEL, edge=PANEL_EDGE)
    content += centered_text(SIDE_MID, ct - 24, 11, MUTED, b"CONTROLS")
    y = ct - 40
    inner_l, inner_r = cl + 18, cr - 18

    button_specs = []    # (name, rect, code)
    if spec.get("dpad"):
        pad_x = SIDE_MID - (3 * BTN + 2 * GAP) / 2
        bottom = y - 2 * BTN - GAP
        pads = [
            ("up", pad_x + BTN + GAP, bottom + BTN + GAP),
            ("left", pad_x, bottom),
            ("down", pad_x + BTN + GAP, bottom),
            ("right", pad_x + 2 * (BTN + GAP), bottom),
        ]
        for name, left, bot in pads:
            content += raised_button(left, bot, left + BTN, bot + BTN, accent, accent_dark)
            content += ink + b" rg\n" + arrow(name, left + BTN / 2, bot + BTN / 2)
            button_specs.append((b"btn_" + name.encode(), (left, bot, left + BTN, bot + BTN), 'onArrow("%s");' % name))
        y = bottom - 18

    actions = spec.get("buttons", [])
    for i in range(0, len(actions), 2):
        row = actions[i:i + 2]
        width = (inner_r - inner_l - GAP * (len(row) - 1)) / len(row)
        for j, (label, name) in enumerate(row):
            left = inner_l + j * (width + GAP)
            rect = (left, y - ACTION_H, left + width, y)
            content += raised_button(*rect, accent, accent_dark, radius=7)
            content += centered_text(left + width / 2, y - ACTION_H + 10, 11, ink, label.encode(), bold=True)
            button_specs.append((b"act_" + name.encode(), rect, 'onBtn("%s");' % name))
        y -= ACTION_H + 12

    kbd_rect = None
    if spec.get("kbd"):
        y -= 2
        kbd_rect = (inner_l, y - KBD_H, inner_r, y)
        content += SCREEN_BG + b" rg " + accent + b" RG 1.5 w " + rounded_rect(*kbd_rect, KBD_H / 2) + b"B\n"
        y -= KBD_H + 14

    y -= 4
    for line in spec.get("help", []):
        content += centered_text(SIDE_MID, y, 9, MUTED, line.encode())
        y -= 12
    assert y > cb, "%s: controls don't fit in the card (y=%d)" % (spec["id"], y)

    pdf.add_stream(CONTENT, content)

    # -------------------------------------------------------------- fields
    text_field(b"status", (SCREEN_LEFT - 14, SCREEN_BOTTOM - 46, SCREEN_RIGHT + 14, SCREEN_BOTTOM - 22),
               b"/Cour 12 Tf " + TEXT + b" rg", b"Open in Chrome, Edge or Firefox to play", align=1)
    text_field(b"score", (sl + 10, sb + 12, SIDE_MID - 10, st - 36), b"/CourB 26 Tf " + accent + b" rg", b"0", align=1)
    text_field(b"best", (SIDE_MID + 10, sb + 12, sr - 10, st - 36), b"/CourB 26 Tf " + TEXT + b" rg", b"0", align=1)

    # Rows are left-aligned (some viewers trim trailing spaces before
    # centering, which would shift short rows). Viewers indent field text by
    # about 2pt, so each field starts 2pt left of where the text should go.
    for i in range(rows):
        top = rows_top - i * row_h
        text_field(b"row%d" % i, (text_left - FIELD_PAD, top - row_h, SCREEN_RIGHT, top),
                   b"/Cour %.1f Tf " % font + accent + b" rg",
                   extra=b"/MK << /BG [" + SCREEN_BG + b"] >> ")

    for name, rect, code in button_specs:
        push_button(name, rect, code)

    # Invisible buttons over clickable squares of the game screen.
    for g in spec.get("click", []):
        sx, sy = g.get("sx", g["cw"]), g.get("sy", g["rh"])
        for cy in range(g["ny"]):
            for cx in range(g["nx"]):
                x0 = text_left + (g["col0"] + cx * sx) * char_w
                y1 = rows_top - (g["row0"] + cy * sy) * row_h
                rect = (x0, y1 - g["rh"] * row_h, x0 + g["cw"] * char_w, y1)
                push_button(b"cell_%s_%d_%d" % (g["g"].encode(), cx, cy), rect,
                            'onCell("%s",%d,%d);' % (g["g"], cx, cy), highlight=b"/N")

    # Keyboard: see build.py for why it works this way. A see-through text
    # box catches key presses on top of a label saying whether it's on.
    if kbd_rect:
        off = spec["kbd"].encode()
        on = b"keyboard ON"
        text_field(b"kbd_label", kbd_rect, b"/Cour 11 Tf " + accent + b" rg", off, align=1)
        KEY_JS, FOCUS_JS, BLUR_JS = pdf.alloc(), pdf.alloc(), pdf.alloc()
        pdf.add_stream(KEY_JS, b"""if (event.change) {
  var key = event.change;
  event.rc = false;
  event.change = "";
  onKey(key);
}""")
        pdf.add_stream(FOCUS_JS, b'this.getField("kbd_label").value = "' + on + b'";')
        pdf.add_stream(BLUR_JS, b'this.getField("kbd_label").value = "' + off + b'"; this.getField("kbd").value = "";')
        kbd = pdf.alloc()
        pdf.add(kbd, b"<< /Type /Annot /Subtype /Widget /FT /Tx /T (kbd) /Rect [%.1f %.1f %.1f %.1f] /P %d 0 R /F 4 /DA (/Cour 1 Tf %s rg) /V () /AA << /K << /S /JavaScript /JS %d 0 R >> /Fo << /S /JavaScript /JS %d 0 R >> /Bl << /S /JavaScript /JS %d 0 R >> >> >>" % (
            kbd_rect[0], kbd_rect[1], kbd_rect[2], kbd_rect[3], PAGE, SCREEN_BG, KEY_JS, FOCUS_JS, BLUR_JS))
        fields.append(kbd)

    pdf.add(LINK, b"<< /Type /Annot /Subtype /Link /Rect [%.1f %.1f %.1f %.1f] /Border [0 0 0] /A << /S /URI /URI (%s) >> >>" % (
        CREATOR_LEFT - 4, CREATOR_Y - 8, CREATOR_RIGHT + 4, CREATOR_Y + 14, PORTFOLIO_URL))

    # -------------------------------------------------------------- game code
    src = spec.get("src", spec["id"])
    prelude = b"var G_ROWS = %d;\nvar G_COLS = %d;\n" % (rows, cols)
    js = b"\n".join([
        prelude,
        open(os.path.join(GAMES_DIR, "lib.js"), "rb").read(),
        open(os.path.join(GAMES_DIR, src + ".js"), "rb").read(),
        open(os.path.join(GAMES_DIR, "platform.js"), "rb").read(),
    ])
    pdf.add(JS_NAMES, b"<< /Names [(init) %d 0 R] >>" % JS_ACTION)
    pdf.add(JS_ACTION, b"<< /S /JavaScript /JS %d 0 R >>" % JS_CODE)
    pdf.add_stream(JS_CODE, js)

    refs = b" ".join(b"%d 0 R" % n for n in fields)
    pdf.add(CATALOG, b"<< /Type /Catalog /Pages %d 0 R /AcroForm << /Fields [%s] /NeedAppearances true /DR << /Font %s >> /DA (/Cour 12 Tf 0 g) >> /Names << /JavaScript %d 0 R >> >>" % (
        PAGES, refs, FONTS_REF, JS_NAMES))
    pdf.add(PAGES, b"<< /Type /Pages /Kids [%d 0 R] /Count 1 >>" % PAGE)
    pdf.add(PAGE, b"<< /Type /Page /Parent %d 0 R /MediaBox [0 0 %d %d] /Resources << /Font %s >> /Contents %d 0 R /Annots [%s %d 0 R] >>" % (
        PAGES, PAGE_W, PAGE_H, FONTS_REF, CONTENT, refs, LINK))
    pdf.add(FONT, b"<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>")
    pdf.add(FONT_BOLD, b"<< /Type /Font /Subtype /Type1 /BaseFont /Courier-Bold >>")
    return pdf.output(CATALOG)


def main():
    specs = json.load(open(os.path.join(GAMES_DIR, "games.json")))
    os.makedirs(WEB_GAMES, exist_ok=True)
    for spec in specs:
        data = build(spec)
        # One copy for opening directly, one for the arcade website (web/).
        for folder in [DIST, WEB_GAMES]:
            with open(os.path.join(folder, spec["id"] + ".pdf"), "wb") as f:
                f.write(data)
        print("wrote %-16s %7d bytes" % (spec["id"] + ".pdf", len(data)))
    build_site(specs)


if __name__ == "__main__":
    main()
