var G_RAW_KEYS = true;
var G_KEYS = { " ": "ok", "-": "del", n: "new" };
var G_BEST_START = null;

var PEGS = 4;
var COLORS = 6;
var TRIES = 10;
var PALETTE = ["1", "2", "3", "4", "5", "6", "<", "OK"];

function gNew() {
  var code = [];
  for (var i = 0; i < PEGS; i++) code.push(String(1 + rnd(COLORS)));
  return { code: code, guesses: [], marks: [], cur: [], score: 0, status: "playing" };
}

// "*" = right number in the right place, "o" = right number, wrong place.
function mark(code, guess) {
  var exact = 0, near = 0, left = {}, i;
  for (i = 0; i < PEGS; i++) {
    if (guess[i] === code[i]) exact++;
    else left[code[i]] = (left[code[i]] || 0) + 1;
  }
  for (i = 0; i < PEGS; i++) {
    if (guess[i] !== code[i] && left[guess[i]]) { near++; left[guess[i]]--; }
  }
  return rep("*", exact) + rep("o", near) + rep(".", PEGS - exact - near);
}

function submit(s) {
  if (s.cur.length < PEGS) return;
  var m = mark(s.code, s.cur);
  s.guesses.push(s.cur);
  s.marks.push(m);
  s.cur = [];
  s.score = s.guesses.length;
  if (m === rep("*", PEGS)) s.status = "won";
  else if (s.guesses.length === TRIES) s.status = "lost";
}

function press(s, key) {
  if (s.status !== "playing") return gNew();
  if (key >= "1" && key <= String(COLORS)) { if (s.cur.length < PEGS) s.cur.push(key); }
  else if (key === "<") s.cur.pop();
  else if (key === "OK") submit(s);
  return null;
}

function gInput(s, kind, a) {
  if (kind === "btn" && a === "new") return gNew();
  if (kind === "btn" && a === "del") return press(s, "<");
  if (kind === "btn" && a === "ok") return press(s, "OK");
  if (kind === "key") return a >= "1" && a <= String(COLORS) ? press(s, a) : null;
  if (kind === "cell") return press(s, PALETTE[a]);
  return null;
}

function gTick() { return false; }

function gBest(s, best) {
  return s.status === "won" ? lowerBest(best, s.score) : best;
}

function pegs(list) {
  var out = "";
  for (var i = 0; i < PEGS; i++) out += list[i] ? "[" + list[i] + "]" : "[ ]";
  return out;
}

function gRows(s) {
  var reveal = s.status !== "playing";
  var rows = [mid("CODE  " + (reveal ? pegs(s.code) : "[?][?][?][?]")), mid(rep("-", 28))];
  for (var i = 0; i < TRIES; i++) {
    var n = padL(i + 1, 2) + "  ";
    if (i < s.guesses.length) rows.push(mid(n + pegs(s.guesses[i]) + "  " + s.marks[i] + "  "));
    else if (i === s.guesses.length && s.status === "playing") rows.push(mid(n + pegs(s.cur) + "  <--   "));
    else rows.push(mid(n + "            " + "        "));
  }
  rows.push(mid(rep("-", 28)));
  var pal = "";
  for (i = 0; i < PALETTE.length; i++) pal += PALETTE[i] === "OK" ? "[OK]" : "[" + PALETTE[i] + "] ";
  rows.push(pal);
  if (s.status === "won") banner(rows, "CRACKED IT!", 1);
  if (s.status === "lost") banner(rows, "OUT OF TRIES", 1);
  return rows;
}

function gStatus(s) {
  if (s.status === "won") return "Cracked in " + s.score + " tries! Click to play again";
  if (s.status === "lost") return "The code was " + s.code.join("") + ". Click to play again";
  return "* = right spot, o = wrong spot. Guess the 4-digit code";
}
