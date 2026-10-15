out = bytearray()

out += b"%PDF-1.7\n"
out += b"%\xe2\xe3\xcf\xd3\n"

offsets = {}

def add_object(num, body):
    global out
    offsets[num] = len(out)
    out += b"%d 0 obj\n" % num
    out += body
    out += b"\nendobj\n"

def add_stream(num, data):
    add_object(num, b"<< /Length %d >>\nstream\n" % len(data) + data + b"\nendstream")

# Object numbers are handed out in order, so they always run 1, 2, 3, ...
next_num = 1
def alloc():
    global next_num
    num = next_num
    next_num += 1
    return num

def rgb(hex_color):
    """'#ff6a3d' -> b'1.000 0.416 0.239' (PDF colors are 0-1, not 0-255)."""
    h = hex_color.lstrip("#")
    return b" ".join(b"%.3f" % (int(h[i:i + 2], 16) / 255) for i in (0, 2, 4))

# ---------------------------------------------------------------- theme
ACCENT = rgb("#ff6a3d")         # snake, buttons, title, highlights
ACCENT_DARK = rgb("#c4471f")    # button shadows / pressed edge
PAGE_BG = rgb("#120b08")        # whole page
PANEL = rgb("#22150f")          # cards and the console bezel
PANEL_EDGE = rgb("#3a241a")     # thin card outlines
SHADOW = rgb("#070403")         # drop shadows
SCREEN_BG = rgb("#1a0f0b")      # game screen
TEXT = rgb("#f4e6df")           # main light text
MUTED = rgb("#a08a80")          # labels and small print
WHITE = rgb("#ffffff")

PAGE_W = 792
PAGE_H = 612

# ---------------------------------------------------------------- layout
GRID_H = 15
SCREEN_ROWS = GRID_H + 2          # plus the top and bottom walls
ROW_H = 20
FONT_SIZE = 16
SCREEN_LEFT = 40
SCREEN_RIGHT = 470
SCREEN_TOP = 500
SCREEN_BOTTOM = SCREEN_TOP - SCREEN_ROWS * ROW_H

SIDE_LEFT = 520
SIDE_RIGHT = 752
SIDE_MID = (SIDE_LEFT + SIDE_RIGHT) // 2

SCORE_CARD = (SIDE_LEFT, 420, SIDE_RIGHT, SCREEN_TOP + 12)       # left, bottom, right, top
CONTROLS_CARD = (SIDE_LEFT, SCREEN_BOTTOM - 12, SIDE_RIGHT, 405)

# Arrow buttons, laid out like arrow keys:
#          [ up ]
#   [left] [down] [right]
BTN = 54
GAP = 8
PAD_X = SIDE_MID - (3 * BTN + 2 * GAP) // 2
PAD_Y = 250
BUTTONS = [
    # name,    left,                       bottom
    (b"up",    PAD_X + BTN + GAP,          PAD_Y + BTN + GAP),
    (b"left",  PAD_X,                      PAD_Y),
    (b"down",  PAD_X + BTN + GAP,          PAD_Y),
    (b"right", PAD_X + 2 * (BTN + GAP),    PAD_Y),
]

KBD_LEFT = SIDE_LEFT + 18
KBD_RIGHT = SIDE_RIGHT - 18
KBD_BOTTOM = 190
KBD_TOP = 220
KBD_RECT = b"[%d %d %d %d]" % (KBD_LEFT, KBD_BOTTOM, KBD_RIGHT, KBD_TOP)
KBD_OFF = b"click here to use W A S D"

# Put your portfolio address here.
PORTFOLIO_URL = b"https://sanjith-portfolio-10.vercel.app/"

# Website that plays the game in any browser, including phones and Safari.
# Shown under the game screen for people whose PDF viewer can't run it.
PLAY_URL = b"https://snake-pdf.vercel.app/"
PLAY_LABEL = b"Can't play here?"
PLAY_LINK_TEXT = b"Click here"
CREATOR_TEXT = b"Meet the creator ->"
CREATOR_Y = 552                   # level with the SNAKE title
CREATOR_RIGHT = SIDE_RIGHT        # lined up with the right edge of the cards
CREATOR_LEFT = CREATOR_RIGHT - len(CREATOR_TEXT) * 12 * 0.6
KBD_ON = b"keyboard ON: W A S D"

# ---------------------------------------------------------------- objects
CATALOG = alloc()
PAGES = alloc()
PAGE = alloc()
FONT = alloc()
FONT_BOLD = alloc()
CONTENT = alloc()
JS_NAMES = alloc()
JS_ACTION = alloc()
JS_CODE = alloc()
STATUS = alloc()
SCORE = alloc()
BEST = alloc()
ROW_OBJS = [alloc() for _ in range(SCREEN_ROWS)]
BUTTON_OBJS = [alloc() for _ in BUTTONS]
KBD = alloc()
KBD_LABEL = alloc()
KEY_JS = alloc()
FOCUS_JS = alloc()
BLUR_JS = alloc()
LINK = alloc()
PLAY_LINK = alloc()

# Later in the list = drawn on top, so "kbd" goes last to receive the clicks.
field_objs = [STATUS, SCORE, BEST] + ROW_OBJS + BUTTON_OBJS + [KBD_LABEL, KBD]
field_refs = b" ".join(b"%d 0 R" % num for num in field_objs)

FONTS = b"<< /Cour %d 0 R /CourB %d 0 R >>" % (FONT, FONT_BOLD)

add_object(CATALOG, b"<< /Type /Catalog /Pages %d 0 R /AcroForm << /Fields [%s] /NeedAppearances true /DR << /Font %s >> /DA (/Cour 12 Tf 0 g) >> /Names << /JavaScript %d 0 R >> >>" % (PAGES, field_refs, FONTS, JS_NAMES))
add_object(PAGES, b"<< /Type /Pages /Kids [%d 0 R] /Count 1 >>" % PAGE)
# The link is an annotation on the page, but not a form field.
add_object(PAGE, b"<< /Type /Page /Parent %d 0 R /MediaBox [0 0 %d %d] /Resources << /Font %s >> /Contents %d 0 R /Annots [%s %d 0 R %d 0 R] >>" % (PAGES, PAGE_W, PAGE_H, FONTS, CONTENT, field_refs, LINK, PLAY_LINK))
add_object(FONT, b"<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>")
add_object(FONT_BOLD, b"<< /Type /Font /Subtype /Type1 /BaseFont /Courier-Bold >>")

# ---------------------------------------------------------------- drawing helpers
# Everything below writes PDF drawing commands. A few to know:
#   "r g b rg" = fill color      "r g b RG" = outline color     "w" = line width
#   "x y m" = move to   "x y l" = line to   "c" = curve   "h" = close shape
#   "f" = fill   "S" = outline   "B" = fill and outline
#   "BT ... ET" = a block of text, "Tf" = font and size, "Td" = position, "Tj" = show

def rounded_rect(left, bottom, right, top, r):
    """Path for a rectangle with rounded corners (each corner is a curve)."""
    k = r * 0.5523   # how far the curve handles reach to look like a circle
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
    return b"BT %s %d Tf %s rg %.1f %.1f Td (%s) Tj ET\n" % (font, size, color, x, y, s)

def centered_text(cx, y, size, color, s, bold=False):
    width = len(s) * size * 0.6    # every Courier character is 0.6 x the font size wide
    return text(cx - width / 2, y, size, color, s, bold)

def arrow(direction, cx, cy):
    s = 12
    points = {
        b"up":    [(cx, cy + s), (cx - s, cy - s * 0.7), (cx + s, cy - s * 0.7)],
        b"down":  [(cx, cy - s), (cx - s, cy + s * 0.7), (cx + s, cy + s * 0.7)],
        b"left":  [(cx - s, cy), (cx + s * 0.7, cy + s), (cx + s * 0.7, cy - s)],
        b"right": [(cx + s, cy), (cx - s * 0.7, cy + s), (cx - s * 0.7, cy - s)],
    }[direction]
    (x1, y1), (x2, y2), (x3, y3) = points
    return b"%.1f %.1f m %.1f %.1f l %.1f %.1f l h f\n" % (x1, y1, x2, y2, x3, y3)

def pixel_snake(x, y):
    """A small pixel-art snake logo made of squares, plus one food pellet."""
    size = 7
    step = 9
    body = [(0, 0), (1, 0), (2, 0), (2, 1), (2, 2), (3, 2), (4, 2), (4, 1)]
    d = ACCENT + b" rg\n"
    for gx, gy in body:
        d += b"%.1f %.1f %d %d re f\n" % (x + gx * step, y + gy * step, size, size)
    head_x = x + 4 * step
    head_y = y + 1 * step
    d += PAGE_BG + b" rg %.1f %.1f 2 2 re f\n" % (head_x + 4, head_y + 3)     # eye
    d += TEXT + b" rg %.1f %.1f %d %d re f\n" % (x + 6 * step, y + 0.5 * step, size - 2, size - 2)  # food
    return d

# ---------------------------------------------------------------- the page
content = b""

# Background
content += PAGE_BG + b" rg 0 0 %d %d re f\n" % (PAGE_W, PAGE_H)
content += ACCENT + b" rg 0 %d %d 4 re f\n" % (PAGE_H - 4, PAGE_W)     # thin top stripe

# Title
content += pixel_snake(SCREEN_LEFT, 544)
content += text(SCREEN_LEFT + 80, 546, 34, ACCENT, b"SNAKE", bold=True)

# Console bezel around the game screen
content += card(SCREEN_LEFT - 14, SCREEN_BOTTOM - 12, SCREEN_RIGHT + 14, SCREEN_TOP + 12, PANEL, edge=ACCENT, radius=14, shadow=6)
content += SCREEN_BG + b" rg %d %d %d %d re f\n" % (SCREEN_LEFT, SCREEN_BOTTOM, SCREEN_RIGHT - SCREEN_LEFT, SCREEN_TOP - SCREEN_BOTTOM)


# Score card
sl, sb, sr, st = SCORE_CARD
content += card(sl, sb, sr, st, PANEL, edge=PANEL_EDGE)
content += centered_text((sl + SIDE_MID) / 2, st - 26, 11, MUTED, b"SCORE")
content += centered_text((SIDE_MID + sr) / 2, st - 26, 11, MUTED, b"BEST")
content += PANEL_EDGE + b" RG 1 w %d %d m %d %d l S\n" % (SIDE_MID, sb + 14, SIDE_MID, st - 14)

# Controls card
cl, cb, cr, ct = CONTROLS_CARD
content += card(cl, cb, cr, ct, PANEL, edge=PANEL_EDGE)
content += centered_text(SIDE_MID, ct - 24, 11, MUTED, b"CONTROLS")

for name, left, bottom in BUTTONS:
    # A darker copy underneath, shifted down, makes the button look raised.
    content += ACCENT_DARK + b" rg " + rounded_rect(left, bottom - 4, left + BTN, bottom + BTN - 4, 9) + b"f\n"
    content += ACCENT + b" rg " + rounded_rect(left, bottom, left + BTN, bottom + BTN, 9) + b"f\n"
    content += WHITE + b" rg\n" + arrow(name, left + BTN / 2, bottom + BTN / 2)

# Keyboard box: a pill shape. The text fields on top of it are see-through.
content += SCREEN_BG + b" rg " + ACCENT + b" RG 1.5 w " + rounded_rect(KBD_LEFT, KBD_BOTTOM, KBD_RIGHT, KBD_TOP, 15) + b"B\n"
content += centered_text(SIDE_MID, KBD_BOTTOM - 22, 9, MUTED, b"click the box, then steer with keys")

# "Can't play here? Play online" line, centered under the game screen. The
# clickable part is the PLAY_LINK annotation below.
PLAY_SIZE = 11
PLAY_Y = SCREEN_BOTTOM - 72
play_label_w = (len(PLAY_LABEL) + 1) * PLAY_SIZE * 0.6
play_link_w = len(PLAY_LINK_TEXT) * PLAY_SIZE * 0.6
play_left = (SCREEN_LEFT + SCREEN_RIGHT) / 2 - (play_label_w + play_link_w) / 2
PLAY_LINK_LEFT = play_left + play_label_w
PLAY_LINK_RIGHT = PLAY_LINK_LEFT + play_link_w
content += text(play_left, PLAY_Y, PLAY_SIZE, MUTED, PLAY_LABEL)
content += text(PLAY_LINK_LEFT, PLAY_Y, PLAY_SIZE, ACCENT, PLAY_LINK_TEXT, bold=True)
content += ACCENT + b" RG 0.8 w %.1f %.1f m %.1f %.1f l S\n" % (PLAY_LINK_LEFT, PLAY_Y - 3, PLAY_LINK_RIGHT, PLAY_Y - 3)

# "Meet the creator" link, top right. The clickable part is the LINK
# annotation below, placed over this text.
content += text(CREATOR_LEFT, CREATOR_Y, 12, ACCENT, CREATOR_TEXT, bold=True)
content += ACCENT + b" RG 1 w %.1f %.1f m %.1f %.1f l S\n" % (CREATOR_LEFT, CREATOR_Y - 4, CREATOR_RIGHT, CREATOR_Y - 4)

add_stream(CONTENT, content)

# ---------------------------------------------------------------- game code
SRC = ["config.js", "state.js", "update.js", "render.js", "platform.js"]
js = b"\n".join(open("src/" + name, "rb").read() for name in SRC)

add_object(JS_NAMES, b"<< /Names [(init) %d 0 R] >>" % JS_ACTION)
add_object(JS_ACTION, b"<< /S /JavaScript /JS %d 0 R >>" % JS_CODE)
add_stream(JS_CODE, js)

# ---------------------------------------------------------------- fields
# Fields without a /MK /BG background are see-through, so the cards drawn on
# the page show behind them.
def text_field(num, name, rect, da, value=b"", align=0, extra=b""):
    add_object(num, b"<< /Type /Annot /Subtype /Widget /FT /Tx /T (%s) /Rect %s /P %d 0 R /F 4 /Ff 1 /Q %d /DA (%s) /V (%s) %s>>" % (name, rect, PAGE, align, da, value, extra))

text_field(STATUS, b"status", b"[%d %d %d %d]" % (SCREEN_LEFT - 14, SCREEN_BOTTOM - 44, SCREEN_RIGHT + 14, SCREEN_BOTTOM - 22),
           b"/Cour 12 Tf " + TEXT + b" rg", b"Open in Chrome, Edge or Firefox to play", align=1)
text_field(SCORE, b"score", b"[%d %d %d %d]" % (sl + 10, sb + 12, SIDE_MID - 10, st - 36),
           b"/CourB 30 Tf " + ACCENT + b" rg", b"0", align=1)
text_field(BEST, b"best", b"[%d %d %d %d]" % (SIDE_MID + 10, sb + 12, sr - 10, st - 36),
           b"/CourB 30 Tf " + TEXT + b" rg", b"0", align=1)

for i in range(SCREEN_ROWS):
    top = SCREEN_TOP - i * ROW_H
    text_field(ROW_OBJS[i], b"row%d" % i, b"[%d %d %d %d]" % (SCREEN_LEFT, top - ROW_H, SCREEN_RIGHT, top),
               b"/Cour %d Tf " % FONT_SIZE + ACCENT + b" rg", extra=b"/MK << /BG [" + SCREEN_BG + b"] >> ")

# /FT /Btn with /Ff 65536 = a push button. /A is the action run on click.
# The buttons are invisible; the page drawing above is what you see.
for num, (name, left, bottom) in zip(BUTTON_OBJS, BUTTONS):
    add_object(num, b"<< /Type /Annot /Subtype /Widget /FT /Btn /Ff 65536 /T (btn_%s) /Rect [%d %d %d %d] /P %d 0 R /F 4 /H /P /A << /S /JavaScript /JS (onArrow\\(\"%s\"\\);) >> >>" % (name, left, bottom, left + BTN, bottom + BTN, PAGE, name))

# Keyboard: an invisible text box ("kbd") that catches W A S D, on top of a
# read-only label ("kbd_label") that shows whether the keyboard is on. Its text
# is 1pt and the same color as the background, so even if a viewer lets a
# letter through, nobody sees it; leaving the box also clears it.
#
# Chrome (PDFium) ignores edits to event.change and always types the original
# key. Only event.rc = false rejects it, so set that first, before any field
# writes. event.change = "" is kept for Acrobat and Firefox.
key_js = b"""if (event.change) {
  var key = event.change;
  event.rc = false;
  event.change = "";
  onKey(key);
}"""
add_stream(KEY_JS, key_js)
add_stream(FOCUS_JS, b'this.getField("kbd_label").value = "' + KBD_ON + b'";')
add_stream(BLUR_JS, b'this.getField("kbd_label").value = "' + KBD_OFF + b'"; this.getField("kbd").value = "";')

text_field(KBD_LABEL, b"kbd_label", KBD_RECT, b"/Cour 11 Tf " + ACCENT + b" rg", KBD_OFF, align=1)
add_object(KBD, b"<< /Type /Annot /Subtype /Widget /FT /Tx /T (kbd) /Rect %s /P %d 0 R /F 4 /DA (/Cour 1 Tf %s rg) /V () /AA << /K << /S /JavaScript /JS %d 0 R >> /Fo << /S /JavaScript /JS %d 0 R >> /Bl << /S /JavaScript /JS %d 0 R >> >> >>" % (KBD_RECT, PAGE, SCREEN_BG, KEY_JS, FOCUS_JS, BLUR_JS))

add_object(LINK, b"<< /Type /Annot /Subtype /Link /Rect [%.1f %.1f %.1f %.1f] /Border [0 0 0] /A << /S /URI /URI (%s) >> >>" % (CREATOR_LEFT - 4, CREATOR_Y - 8, CREATOR_RIGHT + 4, CREATOR_Y + 14, PORTFOLIO_URL))
add_object(PLAY_LINK, b"<< /Type /Annot /Subtype /Link /Rect [%.1f %.1f %.1f %.1f] /Border [0 0 0] /A << /S /URI /URI (%s) >> >>" % (PLAY_LINK_LEFT - 4, PLAY_Y - 7, PLAY_LINK_RIGHT + 4, PLAY_Y + 12, PLAY_URL))

# ---------------------------------------------------------------- xref
xref_pos = len(out)
count = len(offsets) + 1

out += b"xref\n"
out += b"0 %d\n" % count
out += b"0000000000 65535 f \n"

for num in range(1, count):
    out += b"%010d 00000 n \n" % offsets[num]

out += b"trailer\n"
out += b"<< /Size %d /Root %d 0 R >>\n" % (count, CATALOG)
out += b"startxref\n"
out += b"%d\n" % xref_pos
out += b"%%EOF\n"

# One copy for opening directly, one for the website (web/), which shows it
# in the pdf.js viewer so it also plays on phones.
for path in ["dist/snake.pdf", "web/snake.pdf"]:
    with open(path, "wb") as f:
        f.write(out)

print("wrote", len(out), "bytes")
