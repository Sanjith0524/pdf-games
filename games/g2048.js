var G_KEYS = { n: "new" };
var N = 4;
var CELL = 6;

function addTile(s) {
  var free = [];
  for (var y = 0; y < N; y++) for (var x = 0; x < N; x++) if (!s.b[y][x]) free.push([x, y]);
  if (!free.length) return;
  var pick = free[rnd(free.length)];
  s.b[pick[1]][pick[0]] = Math.random() < 0.9 ? 2 : 4;
}

function gNew() {
  var s = { b: grid(N, N, 0), score: 0, status: "playing", won: false };
  addTile(s);
  addTile(s);
  return s;
}

// Slides one line toward index 0, merging equal neighbours once.
function slide(line) {
  var vals = [], out = [], gained = 0;
  for (var i = 0; i < line.length; i++) if (line[i]) vals.push(line[i]);
  for (var j = 0; j < vals.length; j++) {
    if (j + 1 < vals.length && vals[j] === vals[j + 1]) {
      out.push(vals[j] * 2);
      gained += vals[j] * 2;
      j++;
    } else {
      out.push(vals[j]);
    }
  }
  while (out.length < line.length) out.push(0);
  return { line: out, gained: gained };
}

// Cells of line i, starting from the edge the tiles slide toward.
function lineCells(dir, i) {
  var cells = [];
  for (var k = 0; k < N; k++) {
    if (dir === "left") cells.push([k, i]);
    if (dir === "right") cells.push([N - 1 - k, i]);
    if (dir === "up") cells.push([i, k]);
    if (dir === "down") cells.push([i, N - 1 - k]);
  }
  return cells;
}

function move(s, dir) {
  var moved = false;
  for (var i = 0; i < N; i++) {
    var cells = lineCells(dir, i), line = [];
    for (var k = 0; k < N; k++) line.push(s.b[cells[k][1]][cells[k][0]]);
    var r = slide(line);
    for (k = 0; k < N; k++) {
      if (s.b[cells[k][1]][cells[k][0]] !== r.line[k]) moved = true;
      s.b[cells[k][1]][cells[k][0]] = r.line[k];
    }
    s.score += r.gained;
  }
  return moved;
}

function canMove(s) {
  for (var y = 0; y < N; y++) {
    for (var x = 0; x < N; x++) {
      if (!s.b[y][x]) return true;
      if (x + 1 < N && s.b[y][x] === s.b[y][x + 1]) return true;
      if (y + 1 < N && s.b[y][x] === s.b[y + 1][x]) return true;
    }
  }
  return false;
}

function gInput(s, kind, a) {
  if (kind === "btn" && a === "new") return gNew();
  if (kind !== "dir") return null;
  if (s.status === "over") return gNew();
  if (move(s, a)) {
    // The "you made 2048" message only stays up for one move.
    s.status = "playing";
    addTile(s);
    for (var y = 0; y < N; y++) for (var x = 0; x < N; x++) {
      if (s.b[y][x] >= 2048 && !s.won) { s.won = true; s.status = "won"; }
    }
    if (!canMove(s)) s.status = "over";
  }
  return null;
}

function gTick() { return false; }

function gRows(s) {
  var line = "+" + rep(rep("-", CELL) + "+", N);
  var rows = [line];
  for (var y = 0; y < N; y++) {
    var blank = "|", val = "|";
    for (var x = 0; x < N; x++) {
      blank += rep(" ", CELL) + "|";
      val += mid(s.b[y][x] ? String(s.b[y][x]) : ".", CELL) + "|";
    }
    rows.push(blank, val, blank, line);
  }
  if (s.status === "over") banner(rows, "GAME OVER");
  return rows;
}

function gStatus(s) {
  if (s.status === "over") return "No moves left - press an arrow for a new game";
  if (s.status === "won") return "You made 2048! Keep going for a bigger tile";
  return "Slide with the arrows. Equal tiles merge";
}
