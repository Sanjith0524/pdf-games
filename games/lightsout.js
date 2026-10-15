var G_BEST_START = null;
var LN = 5;

function gNew() {
  var s = { on: grid(LN, LN, false), score: 0, status: "playing" };
  // Start from all-off and press random squares, so it can always be solved.
  while (lit(s) < 6) {
    for (var i = 0; i < 12; i++) press(s, rnd(LN), rnd(LN));
  }
  s.start = copyGrid(s.on);
  return s;
}

function lit(s) {
  var n = 0;
  for (var y = 0; y < LN; y++) for (var x = 0; x < LN; x++) if (s.on[y][x]) n++;
  return n;
}

function press(s, x, y) {
  var spots = [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]];
  for (var i = 0; i < spots.length; i++) {
    var nx = x + spots[i][0], ny = y + spots[i][1];
    if (nx >= 0 && ny >= 0 && nx < LN && ny < LN) s.on[ny][nx] = !s.on[ny][nx];
  }
}

function gInput(s, kind, a, b) {
  if (kind === "btn" && a === "new") return gNew();
  if (kind === "btn" && a === "reset") { s.on = copyGrid(s.start); s.score = 0; s.status = "playing"; return null; }
  if (kind !== "cell") return null;
  if (s.status === "won") return gNew();
  press(s, a, b);
  s.score++;
  if (lit(s) === 0) s.status = "won";
  return null;
}

function gTick() { return false; }

function gBest(s, best) {
  return s.status === "won" ? lowerBest(best, s.score) : best;
}

function gRows(s) {
  var rows = [];
  for (var y = 0; y < LN; y++) {
    var line = [];
    for (var x = 0; x < LN; x++) line.push(s.on[y][x] ? "[#####]" : "[     ]");
    var text = line.join(" ");
    rows.push(text, text);
    if (y < LN - 1) rows.push("");
  }
  if (s.status === "won") banner(rows, "LIGHTS OUT!", 7);
  return rows;
}

function gStatus(s) {
  if (s.status === "won") return "Solved in " + s.score + " moves! Click to play again";
  return "Turn every light off. A click flips a + shape";
}
