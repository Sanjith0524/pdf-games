// Glue between a game and the PDF form. Every game defines:
//   gNew()                    -> a fresh state with a .score
//   gInput(s, kind, a, b, c)  -> handles "dir", "btn", "key" and "cell";
//                                may return a new state to replace s
//   gTick(s)                  -> true if the screen changed
//   gRows(s), gStatus(s)      -> what to show
//   gBest(s, best)            -> optional, otherwise best = highest score
var doc = this;
var S = gNew();
var best = typeof G_BEST_START !== "undefined" ? G_BEST_START : 0;
var lastText = {};
var WASD = { w: "up", a: "left", s: "down", d: "right" };

function setField(name, text) {
  if (lastText[name] === text) return;
  doc.getField(name).value = text;
  lastText[name] = text;
}

function draw() {
  var rows = gRows(S);
  for (var i = 0; i < G_ROWS; i++) setField("row" + i, padR(rows[i] || "", G_COLS));
  setField("status", gStatus(S));
  if (typeof gBest === "function") best = gBest(S, best);
  else if (S.score > best) best = S.score;
  setField("score", String(S.score));
  setField("best", best === null ? "-" : String(best));
}

function input(kind, a, b, c) {
  var next = gInput(S, kind, a, b, c);
  if (next) S = next;
  draw();
}

function onArrow(dir) { input("dir", dir); }
function onBtn(name) { input("btn", name); }
function onCell(group, x, y) { input("cell", x, y, group); }

function onKey(text) {
  for (var i = 0; i < text.length; i++) {
    var k = text.charAt(i).toLowerCase();
    if (G_KEYS[k]) input("btn", G_KEYS[k]);
    else if (!G_RAW_KEYS && WASD[k]) input("dir", WASD[k]);
    else input("key", k);
  }
}

function tick() {
  if (gTick(S)) draw();
}

draw();
var timer = G_TICK > 0 ? app.setInterval("tick()", G_TICK) : null;
