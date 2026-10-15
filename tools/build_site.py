"""Writes web/index.html: the arcade page that lists every game.

Run by build_games.py after the PDFs are copied into web/games/, so the page
always matches games/games.json. Each card opens its game the same way the
old snake-only page did: desktop Chrome/Edge get the PDF itself (their
built-in viewer runs the game), everything else gets the pdf.js viewer.
"""
import html
import json
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PORTFOLIO_URL = "https://sanjith-portfolio-10.vercel.app/"

# Snake is built separately by build.py, so it isn't in games.json.
SNAKE = {
    "id": "snake", "pdf": "snake.pdf", "title": "SNAKE", "kind": "Arcade", "accent": "#ff6a3d",
    "blurb": "The original. Eat, grow, and don't bite your own tail.",
    "icon": ["..###..", "..#.#..", "###...o"],
}


def pixel_svg(pattern, accent):
    """The game's pixel logo as a small inline SVG ('#' accent, 'o' light)."""
    w = max(len(row) for row in pattern)
    rects = []
    for y, row in enumerate(pattern):
        for x, ch in enumerate(row):
            if ch in "#o":
                fill = accent if ch == "#" else "var(--text)"
                rects.append('<rect x="%d" y="%d" width="7" height="7" fill="%s"/>' % (x * 9, y * 9, fill))
    return '<svg class="icon" viewBox="0 0 %d %d" aria-hidden="true">%s</svg>' % (w * 9 - 2, len(pattern) * 9 - 2, "".join(rects))


def card(game):
    pdf = game.get("pdf", "games/%s.pdf" % game["id"])
    viewer = "pdfjs/web/viewer.html?file=../../%s#zoom=page-fit" % pdf
    e = html.escape
    return """    <li class="card" data-kind="%(kind)s" style="--accent: %(accent)s">
      <a class="play" href="%(viewer)s" data-pdf="%(pdf)s">
        %(icon)s
        <span class="name">%(title)s</span>
        <span class="kind">%(kind)s</span>
        <span class="blurb">%(blurb)s</span>
        <span class="go">PLAY &rarr;</span>
      </a>
      <a class="file" href="%(pdf)s" download>PDF</a>
    </li>""" % {
        "kind": e(game["kind"]), "accent": e(game["accent"]), "viewer": e(viewer), "pdf": e(pdf),
        "icon": pixel_svg(game["icon"], game["accent"]), "title": e(game["title"]), "blurb": e(game["blurb"]),
    }


PAGE = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>PDF Arcade</title>
<meta name="description" content="%(count)d games that run inside a PDF file. Pick one and play.">
<style>
  :root {
    --bg: #0e0f13; --panel: #171a21; --edge: #2a2f3a; --text: #e8eaf0; --muted: #8a90a0;
    --brand: #ff6a3d;
    --mono: ui-monospace, "SF Mono", Menlo, Consolas, "Courier New", monospace;
  }
  * { box-sizing: border-box; }
  body { margin: 0; background: var(--bg); color: var(--text); font-family: var(--mono); }
  body::before { content: ""; display: block; height: 4px; background: var(--brand); }
  .wrap { max-width: 1120px; margin: 0 auto; padding: 40px 16px 56px; }

  header { display: flex; flex-wrap: wrap; align-items: flex-end; justify-content: space-between; gap: 16px 32px; margin-bottom: 28px; }
  h1 { margin: 0; font-size: clamp(32px, 6vw, 48px); letter-spacing: 0.02em; color: var(--brand); line-height: 1; }
  .tagline { margin: 10px 0 0; color: var(--muted); font-size: 14px; max-width: 52ch; line-height: 1.5; }
  .creator { color: var(--brand); font-weight: 700; font-size: 14px; text-underline-offset: 4px; white-space: nowrap; }

  .filters { display: flex; flex-wrap: wrap; gap: 8px; margin: 0 0 24px; padding: 0; list-style: none; }
  .filters button {
    font: inherit; font-size: 13px; color: var(--muted); background: var(--panel);
    border: 1px solid var(--edge); border-radius: 999px; padding: 7px 14px; cursor: pointer;
  }
  .filters button:hover { color: var(--text); }
  .filters button[aria-pressed="true"] { color: var(--bg); background: var(--text); border-color: var(--text); }

  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(240px, 100%%), 1fr)); gap: 16px; margin: 0; padding: 0; list-style: none; }
  .card { position: relative; }
  .card[hidden] { display: none; }
  .play {
    display: grid; grid-template-columns: auto 1fr; grid-template-areas: "icon kind" "name name" "blurb blurb" "go go";
    align-items: start; gap: 10px 12px; height: 100%%; padding: 18px; text-decoration: none; color: inherit;
    background: var(--panel); border: 1.5px solid var(--edge); border-radius: 12px;
    transition: border-color 0.15s, transform 0.15s;
  }
  .play:hover, .play:focus-visible { border-color: var(--accent); transform: translateY(-2px); outline: none; }
  .icon { grid-area: icon; height: 36px; width: auto; }
  .kind { grid-area: kind; justify-self: end; font-size: 11px; color: var(--muted); text-transform: uppercase; letter-spacing: 0.08em; }
  .name { grid-area: name; font-size: 20px; font-weight: 700; color: var(--accent); }
  .blurb { grid-area: blurb; font-size: 13px; line-height: 1.5; color: var(--muted); }
  .go { grid-area: go; align-self: end; font-size: 13px; font-weight: 700; color: var(--accent); }
  .file {
    position: absolute; right: 18px; bottom: 18px; font-size: 11px; color: var(--muted);
    text-decoration: none; border: 1px solid var(--edge); border-radius: 6px; padding: 3px 7px;
  }
  .file:hover { color: var(--text); border-color: var(--muted); }

  footer { margin-top: 40px; color: var(--muted); font-size: 13px; line-height: 1.6; max-width: 70ch; }
  footer strong { color: var(--text); }
</style>
</head>
<body>
<div class="wrap">
  <header>
    <div>
      <h1>PDF ARCADE</h1>
      <p class="tagline">%(count)d games that live inside a PDF file. Pick one and play, or grab the PDF and open it in Chrome, Edge or Firefox.</p>
    </div>
    <a class="creator" href="%(portfolio)s">Meet the creator &rarr;</a>
  </header>

  <ul class="filters" aria-label="Filter games">
%(filters)s
  </ul>

  <ul class="grid">
%(cards)s
  </ul>

  <footer>
    <p><strong>How does this work?</strong> Every game is a single PDF. The screen is a stack of form fields that the PDF's own JavaScript rewrites many times a second. Desktop Chrome and Edge run it in their built-in PDF viewer; on phones, Safari and Firefox it opens in a web PDF viewer instead.</p>
  </footer>
</div>
<script>
  // Desktop Chrome, Edge, Brave and Opera have a PDF viewer that runs the
  // games, so link straight to the PDFs there. Everyone else keeps the
  // pdf.js viewer links, which also work without this script.
  (function () {
    var ua = navigator.userAgentData;
    var isChromium = !!(ua && ua.brands && ua.brands.some(function (b) { return b.brand === "Chromium"; }));
    if (isChromium && ua.mobile === false) {
      document.querySelectorAll("a.play").forEach(function (a) { a.href = a.getAttribute("data-pdf"); });
    }

    var buttons = document.querySelectorAll(".filters button");
    buttons.forEach(function (button) {
      button.addEventListener("click", function () {
        var kind = button.getAttribute("data-kind");
        buttons.forEach(function (b) { b.setAttribute("aria-pressed", String(b === button)); });
        document.querySelectorAll(".card").forEach(function (card) {
          card.hidden = kind !== "All" && card.getAttribute("data-kind") !== kind;
        });
      });
    });
  })();
</script>
</body>
</html>
"""


def build_site(specs):
    games = [SNAKE] + specs
    kinds = ["All"] + sorted(set(g["kind"] for g in games), key=lambda k: ["Arcade", "Puzzle", "Board", "Word"].index(k))
    filters = "\n".join('    <li><button type="button" data-kind="%s" aria-pressed="%s">%s</button></li>' % (
        k, "true" if k == "All" else "false", k) for k in kinds)
    page = PAGE % {
        "count": len(games), "portfolio": PORTFOLIO_URL, "filters": filters,
        "cards": "\n".join(card(g) for g in games),
    }
    path = os.path.join(ROOT, "web", "index.html")
    with open(path, "w") as f:
        f.write(page)
    print("wrote web/index.html with %d games" % len(games))


if __name__ == "__main__":
    build_site(json.load(open(os.path.join(ROOT, "games", "games.json"))))
