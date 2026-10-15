var G_RAW_KEYS = true;
var G_KEYS = { n: "new", l: "level" };

var CW = 7;
var CH = 6;
var starts = "you";

function gNew(prev) {
  var s = {
    b: grid(CW, CH, ""), status: "playing", win: null, last: -1,
    score: prev ? prev.score : 0, cpu: prev ? prev.cpu : 0, hard: prev ? prev.hard : true
  };
  starts = prev ? (starts === "you" ? "cpu" : "you") : "you";
  if (starts === "cpu") drop(s, 3, "O");
  return s;
}

function dropRow(b, col) {
  for (var y = CH - 1; y >= 0; y--) if (!b[y][col]) return y;
  return -1;
}

function drop(s, col, who) {
  var y = dropRow(s.b, col);
  if (y < 0) return false;
  s.b[y][col] = who;
  s.last = col;
  return true;
}

var DIRS4 = [[1, 0], [0, 1], [1, 1], [1, -1]];

function findWin(b) {
  for (var y = 0; y < CH; y++) for (var x = 0; x < CW; x++) {
    var who = b[y][x];
    if (!who) continue;
    for (var d = 0; d < 4; d++) {
      var cells = [[x, y]];
      for (var k = 1; k < 4; k++) {
        var nx = x + DIRS4[d][0] * k, ny = y + DIRS4[d][1] * k;
        if (nx < 0 || ny < 0 || nx >= CW || ny >= CH || b[ny][nx] !== who) break;
        cells.push([nx, ny]);
      }
      if (cells.length === 4) return { who: who, cells: cells };
    }
  }
  return null;
}

function full(b) {
  for (var x = 0; x < CW; x++) if (!b[0][x]) return false;
  return true;
}

// Scores every window of four: more of your pieces with no opponent is better.
function evaluate(b) {
  var score = 0;
  for (var y = 0; y < CH; y++) if (b[y][3] === "O") score += 3; else if (b[y][3] === "X") score -= 3;
  for (y = 0; y < CH; y++) for (var x = 0; x < CW; x++) for (var d = 0; d < 4; d++) {
    var o = 0, p = 0, ok = true;
    for (var k = 0; k < 4; k++) {
      var nx = x + DIRS4[d][0] * k, ny = y + DIRS4[d][1] * k;
      if (nx < 0 || ny < 0 || nx >= CW || ny >= CH) { ok = false; break; }
      if (b[ny][nx] === "O") o++; else if (b[ny][nx] === "X") p++;
    }
    if (!ok || (o && p)) continue;
    if (o === 3) score += 5; else if (o === 2) score += 2;
    if (p === 3) score -= 6; else if (p === 2) score -= 2;
  }
  return score;
}

var ORDER = [3, 2, 4, 1, 5, 0, 6];

function search(b, depth, alpha, beta, turn) {
  var w = findWin(b);
  if (w) return w.who === "O" ? 100000 + depth : -100000 - depth;
  if (depth === 0 || full(b)) return evaluate(b);
  for (var i = 0; i < CW; i++) {
    var col = ORDER[i], y = dropRow(b, col);
    if (y < 0) continue;
    b[y][col] = turn;
    var v = search(b, depth - 1, alpha, beta, turn === "O" ? "X" : "O");
    b[y][col] = "";
    if (turn === "O") { if (v > alpha) alpha = v; } else if (v < beta) beta = v;
    if (alpha >= beta) break;
  }
  return turn === "O" ? alpha : beta;
}

function cpuMove(s) {
  // Depth 4 keeps each move well under a second even in slow PDF viewers.
  var depth = s.hard ? 4 : 1, bestV = -Infinity, pick = -1;
  for (var i = 0; i < CW; i++) {
    var col = ORDER[i], y = dropRow(s.b, col);
    if (y < 0) continue;
    s.b[y][col] = "O";
    var v = s.hard ? search(s.b, depth, bestV, Infinity, "X") : search(s.b, depth, -Infinity, Infinity, "X") + Math.random() * 8;
    s.b[y][col] = "";
    if (v > bestV) { bestV = v; pick = col; }
  }
  if (pick >= 0) drop(s, pick, "O");
}

function finish(s) {
  var w = findWin(s.b);
  if (w) {
    s.status = "over"; s.win = w;
    if (w.who === "X") s.score++; else s.cpu++;
    return true;
  }
  if (full(s.b)) { s.status = "over"; s.win = { who: "draw", cells: [] }; return true; }
  return false;
}

function play(s, col) {
  if (s.status !== "playing" || !drop(s, col, "X")) return null;
  if (!finish(s)) { cpuMove(s); finish(s); }
  return null;
}

function gInput(s, kind, a) {
  if (kind === "btn" && a === "new") return gNew(s);
  if (kind === "btn" && a === "level") { s.hard = !s.hard; return null; }
  if (s.status === "over" && (kind === "cell" || kind === "key")) return gNew(s);
  if (kind === "cell") return play(s, a);
  if (kind === "key" && a >= "1" && a <= "7") return play(s, Number(a) - 1);
  return null;
}

function gTick() { return false; }
function gBest(s) { return s.cpu; }

function isWinCell(s, x, y) {
  if (!s.win) return false;
  for (var i = 0; i < s.win.cells.length; i++) if (s.win.cells[i][0] === x && s.win.cells[i][1] === y) return true;
  return false;
}

function gRows(s) {
  var head = " ";
  for (var x = 0; x < CW; x++) head += mid(x === s.last ? "v" + (x + 1) + "v" : String(x + 1), 5) + " ";
  var rows = [head];
  for (var y = 0; y < CH; y++) {
    var top = "|", bottom = "|";
    for (x = 0; x < CW; x++) {
      var c = s.b[y][x], hot = isWinCell(s, x, y);
      if (c === "X") { top += hot ? "[***]" : "[XXX]"; bottom += hot ? "[***]" : "[XXX]"; }
      else if (c === "O") { top += hot ? "(***)" : "(OOO)"; bottom += hot ? "(***)" : "(OOO)"; }
      else { top += "     "; bottom += "  .  "; }
      top += "|"; bottom += "|";
    }
    rows.push(top, bottom);
  }
  rows.push("+" + rep("-----+", CW));
  return rows;
}

function gStatus(s) {
  if (s.status === "over") {
    var msg = s.win.who === "X" ? "You win!" : s.win.who === "O" ? "CPU wins." : "Draw.";
    return msg + " Click the board to play again";
  }
  return "You are [XXX]. Click a column or press 1-7. Level: " + (s.hard ? "HARD" : "EASY");
}
