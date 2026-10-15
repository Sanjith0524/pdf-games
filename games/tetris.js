var G_TICK = 50;
var G_KEYS = { " ": "drop" };

var BW = 10;
var BH = 20;
var SIDE_W = 12;

// Each piece is a list of [x, y] cells inside a size x size box.
var PIECES = [
  { size: 4, cells: [[0, 1], [1, 1], [2, 1], [3, 1]] },   // I
  { size: 3, cells: [[0, 0], [0, 1], [1, 1], [2, 1]] },   // J
  { size: 3, cells: [[2, 0], [0, 1], [1, 1], [2, 1]] },   // L
  { size: 2, cells: [[0, 0], [1, 0], [0, 1], [1, 1]] },   // O
  { size: 3, cells: [[1, 0], [2, 0], [0, 1], [1, 1]] },   // S
  { size: 3, cells: [[0, 0], [1, 0], [1, 1], [2, 1]] },   // Z
  { size: 3, cells: [[1, 0], [0, 1], [1, 1], [2, 1]] }    // T
];
var LINE_POINTS = [0, 100, 300, 500, 800];

function spawn(type) {
  var p = PIECES[type];
  return { type: type, size: p.size, cells: p.cells.slice(), x: Math.floor((BW - p.size) / 2), y: 0 };
}

function gNew() {
  return { board: grid(BW, BH, 0), cur: spawn(rnd(7)), next: rnd(7), score: 0, lines: 0, level: 0, fall: 0, status: "ready" };
}

function fits(s, cells, x, y) {
  for (var i = 0; i < cells.length; i++) {
    var bx = x + cells[i][0], by = y + cells[i][1];
    if (bx < 0 || bx >= BW || by >= BH) return false;
    if (by >= 0 && s.board[by][bx]) return false;
  }
  return true;
}

function rotated(piece) {
  var out = [];
  for (var i = 0; i < piece.cells.length; i++) {
    out.push([piece.size - 1 - piece.cells[i][1], piece.cells[i][0]]);
  }
  return out;
}

function rotate(s) {
  var cells = rotated(s.cur);
  var kicks = [0, -1, 1, -2, 2];
  for (var i = 0; i < kicks.length; i++) {
    if (fits(s, cells, s.cur.x + kicks[i], s.cur.y)) {
      s.cur.cells = cells;
      s.cur.x += kicks[i];
      return;
    }
  }
}

function lock(s) {
  var c = s.cur;
  for (var i = 0; i < c.cells.length; i++) {
    var by = c.y + c.cells[i][1];
    if (by < 0) { s.status = "over"; return; }
    s.board[by][c.x + c.cells[i][0]] = 1;
  }
  var cleared = 0;
  for (var y = BH - 1; y >= 0; y--) {
    var full = true;
    for (var x = 0; x < BW; x++) if (!s.board[y][x]) full = false;
    if (full) {
      s.board.splice(y, 1);
      var empty = [];
      for (var e = 0; e < BW; e++) empty.push(0);
      s.board.unshift(empty);
      cleared++;
      y++;   // check the row that just moved down into this spot
    }
  }
  s.lines += cleared;
  s.score += LINE_POINTS[cleared] * (s.level + 1);
  s.level = Math.floor(s.lines / 10);
  s.cur = spawn(s.next);
  s.next = rnd(7);
  if (!fits(s, s.cur.cells, s.cur.x, s.cur.y)) s.status = "over";
}

function fallDelay(s) {
  return Math.max(2, 16 - Math.floor(s.level * 1.5));
}

function gTick(s) {
  if (s.status !== "playing") return false;
  s.fall++;
  if (s.fall < fallDelay(s)) return false;
  s.fall = 0;
  if (fits(s, s.cur.cells, s.cur.x, s.cur.y + 1)) s.cur.y++;
  else lock(s);
  return true;
}

function gInput(s, kind, a) {
  if (kind !== "dir" && kind !== "btn") return null;
  if (s.status !== "playing") {
    var fresh = gNew();
    fresh.status = "playing";
    return fresh;
  }
  if (a === "left" || a === "right") {
    var dx = a === "left" ? -1 : 1;
    if (fits(s, s.cur.cells, s.cur.x + dx, s.cur.y)) s.cur.x += dx;
  } else if (a === "up" || a === "rotate") {
    rotate(s);
  } else if (a === "down") {
    if (fits(s, s.cur.cells, s.cur.x, s.cur.y + 1)) { s.cur.y++; s.score += 1; s.fall = 0; }
    else lock(s);
  } else if (a === "drop") {
    while (fits(s, s.cur.cells, s.cur.x, s.cur.y + 1)) { s.cur.y++; s.score += 2; }
    lock(s);
  }
  return null;
}

function sideText(s, y) {
  if (y === 1) return "NEXT";
  if (y >= 2 && y <= 5) {
    var p = PIECES[s.next], row = "";
    for (var x = 0; x < 4; x++) {
      var on = false;
      for (var i = 0; i < p.cells.length; i++) if (p.cells[i][0] === x && p.cells[i][1] === y - 2) on = true;
      row += on ? "[]" : "  ";
    }
    return row;
  }
  if (y === 8) return "LINES";
  if (y === 9) return String(s.lines);
  if (y === 11) return "LEVEL";
  if (y === 12) return String(s.level);
  return "";
}

function gRows(s) {
  var g = copyGrid(s.board);
  var c = s.cur, i, by;
  if (s.status === "playing") {
    var ghostY = c.y;
    while (fits(s, c.cells, c.x, ghostY + 1)) ghostY++;
    for (i = 0; i < c.cells.length; i++) {
      by = ghostY + c.cells[i][1];
      if (by >= 0 && !g[by][c.x + c.cells[i][0]]) g[by][c.x + c.cells[i][0]] = 2;
    }
  }
  if (s.status !== "ready") {
    for (i = 0; i < c.cells.length; i++) {
      by = c.y + c.cells[i][1];
      if (by >= 0) g[by][c.x + c.cells[i][0]] = 1;
    }
  }
  var rows = [];
  for (var y = 0; y < BH; y++) {
    var line = "<!";
    for (var x = 0; x < BW; x++) line += g[y][x] === 1 ? "[]" : g[y][x] === 2 ? "::" : " .";
    rows.push(line + "!>  " + padR(sideText(s, y), SIDE_W));
  }
  rows.push("<!" + rep("==", BW) + "!>" + rep(" ", SIDE_W + 2));
  rows.push("  " + rep("\\/", BW) + rep(" ", SIDE_W + 4));

  var label = s.status === "ready" ? " READY? " : s.status === "over" ? " GAME OVER " : "";
  if (label) {
    var at = 2 + BW - Math.floor(label.length / 2);
    rows[9] = overlay(rows[9], label, at);
  }
  return rows;
}

function gStatus(s) {
  if (s.status === "ready") return "Press any arrow to start";
  if (s.status === "over") return "Game over - press an arrow to play again";
  return "Up rotates, Down drops faster, DROP slams it down";
}
