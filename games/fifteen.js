var G_BEST_START = null;
var G_KEYS = { n: "new" };
var FN = 4;
var CELL = 6;

function gNew() {
  var s = { b: [], score: 0, status: "playing" };
  for (var y = 0; y < FN; y++) {
    s.b.push([]);
    for (var x = 0; x < FN; x++) s.b[y].push((y * FN + x + 1) % (FN * FN));
  }
  s.ex = FN - 1; s.ey = FN - 1;
  // Scramble with legal moves only, so the puzzle is always solvable.
  var last = null;
  for (var i = 0; i < 300 || solved(s); i++) {
    var dir = DIR_NAMES[rnd(4)];
    if (dir === OPP[last]) continue;
    if (slideFrom(s, s.ex + DIRV[dir].x, s.ey + DIRV[dir].y)) last = dir;
  }
  s.score = 0;
  return s;
}

function solved(s) {
  for (var y = 0; y < FN; y++) for (var x = 0; x < FN; x++) {
    if (s.b[y][x] !== (y * FN + x + 1) % (FN * FN)) return false;
  }
  return true;
}

// Slides the tile at (x, y) toward the gap, along with any tiles in between.
function slideFrom(s, x, y) {
  if (x < 0 || y < 0 || x >= FN || y >= FN) return false;
  if (x !== s.ex && y !== s.ey) return false;
  if (x === s.ex && y === s.ey) return false;
  var dx = x > s.ex ? 1 : x < s.ex ? -1 : 0, dy = y > s.ey ? 1 : y < s.ey ? -1 : 0;
  while (s.ex !== x || s.ey !== y) {
    s.b[s.ey][s.ex] = s.b[s.ey + dy][s.ex + dx];
    s.ex += dx; s.ey += dy;
    s.b[s.ey][s.ex] = 0;
    s.score++;
  }
  return true;
}

function gInput(s, kind, a, b) {
  if (kind === "btn" && a === "new") return gNew();
  if (s.status === "won") return kind === "cell" || kind === "dir" ? gNew() : null;
  // Arrows move a tile in that direction, into the gap.
  if (kind === "dir") slideFrom(s, s.ex - DIRV[a].x, s.ey - DIRV[a].y);
  if (kind === "cell") slideFrom(s, a, b);
  if (solved(s)) s.status = "won";
  return null;
}

function gTick() { return false; }

function gBest(s, best) {
  return s.status === "won" ? lowerBest(best, s.score) : best;
}

function gRows(s) {
  var line = "+" + rep(rep("-", CELL) + "+", FN);
  var rows = [line];
  for (var y = 0; y < FN; y++) {
    var blank = "|", val = "|";
    for (var x = 0; x < FN; x++) {
      var v = s.b[y][x];
      blank += (v ? rep(" ", CELL) : rep(":", CELL)) + "|";
      val += (v ? mid(String(v), CELL) : rep(":", CELL)) + "|";
    }
    rows.push(blank, val, blank, line);
  }
  if (s.status === "won") banner(rows, "SOLVED!");
  return rows;
}

function gStatus(s) {
  if (s.status === "won") return "Solved in " + s.score + " moves! Click for a new puzzle";
  return "Put the tiles in order 1-15. Click a tile or use arrows";
}
