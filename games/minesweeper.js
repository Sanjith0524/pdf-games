var G_TICK = 1000;
var G_KEYS = { " ": "dig", f: "flag", m: "mode", n: "new" };
var G_BEST_START = null;

var MW = 12;
var MH = 10;
var MINES = 18;

function gNew() {
  return {
    mine: grid(MW, MH, false), open: grid(MW, MH, false), flag: grid(MW, MH, false),
    cx: Math.floor(MW / 2), cy: Math.floor(MH / 2), mode: "dig", placed: false,
    status: "playing", time: 0, score: MINES, boom: null, opened: 0
  };
}

function neighbours(x, y) {
  var out = [];
  for (var dy = -1; dy <= 1; dy++) for (var dx = -1; dx <= 1; dx++) {
    var nx = x + dx, ny = y + dy;
    if ((dx || dy) && nx >= 0 && ny >= 0 && nx < MW && ny < MH) out.push([nx, ny]);
  }
  return out;
}

function count(s, x, y, what) {
  var n = 0, around = neighbours(x, y);
  for (var i = 0; i < around.length; i++) if (s[what][around[i][1]][around[i][0]]) n++;
  return n;
}

// Mines go in after the first dig, never on or next to that square.
function placeMines(s, sx, sy) {
  var spots = [];
  for (var y = 0; y < MH; y++) for (var x = 0; x < MW; x++) {
    if (Math.abs(x - sx) > 1 || Math.abs(y - sy) > 1) spots.push([x, y]);
  }
  shuffle(spots);
  for (var i = 0; i < MINES; i++) s.mine[spots[i][1]][spots[i][0]] = true;
  s.placed = true;
}

function reveal(s, x, y) {
  var todo = [[x, y]];
  while (todo.length) {
    var c = todo.pop(), cx = c[0], cy = c[1];
    if (s.open[cy][cx] || s.flag[cy][cx]) continue;
    s.open[cy][cx] = true;
    s.opened++;
    if (count(s, cx, cy, "mine") === 0) {
      var around = neighbours(cx, cy);
      for (var i = 0; i < around.length; i++) todo.push(around[i]);
    }
  }
}

function dig(s, x, y) {
  if (s.flag[y][x]) return;
  if (!s.placed) placeMines(s, x, y);
  var targets = [[x, y]];
  // Digging an open number whose flags are all placed opens its neighbours.
  if (s.open[y][x]) {
    if (count(s, x, y, "flag") !== count(s, x, y, "mine")) return;
    targets = neighbours(x, y);
  }
  for (var i = 0; i < targets.length; i++) {
    var tx = targets[i][0], ty = targets[i][1];
    if (s.flag[ty][tx] || s.open[ty][tx]) continue;
    if (s.mine[ty][tx]) { s.status = "lost"; s.boom = [tx, ty]; return; }
    reveal(s, tx, ty);
  }
  if (s.opened === MW * MH - MINES) {
    s.status = "won";
    for (var yy = 0; yy < MH; yy++) for (var xx = 0; xx < MW; xx++) s.flag[yy][xx] = s.mine[yy][xx];
    s.score = 0;
  }
}

function toggleFlag(s, x, y) {
  if (s.open[y][x]) return;
  s.flag[y][x] = !s.flag[y][x];
  s.score += s.flag[y][x] ? -1 : 1;
}

function gInput(s, kind, a, b) {
  if (kind === "btn" && a === "new") return gNew();
  if (kind === "btn" && a === "mode") { s.mode = s.mode === "dig" ? "flag" : "dig"; return null; }
  if (kind === "dir") {
    s.cx = Math.max(0, Math.min(MW - 1, s.cx + DIRV[a].x));
    s.cy = Math.max(0, Math.min(MH - 1, s.cy + DIRV[a].y));
    return null;
  }
  if (s.status !== "playing") {
    if (kind === "cell") return gNew();
    return null;
  }
  if (kind === "cell") {
    s.cx = a; s.cy = b;
    if (s.mode === "dig") dig(s, a, b); else toggleFlag(s, a, b);
  } else if (kind === "btn" && a === "dig") {
    dig(s, s.cx, s.cy);
  } else if (kind === "btn" && a === "flag") {
    toggleFlag(s, s.cx, s.cy);
  }
  return null;
}

function gTick(s) {
  if (s.status !== "playing" || !s.placed || s.time >= 999) return false;
  s.time++;
  return true;
}

function gBest(s, best) {
  return s.status === "won" ? lowerBest(best, s.time) : best;
}

function cellText(s, x, y) {
  var over = s.status !== "playing";
  if (s.open[y][x]) {
    var n = count(s, x, y, "mine");
    return n ? String(n) : " ";
  }
  if (over && s.boom && s.boom[0] === x && s.boom[1] === y) return "*";
  if (s.flag[y][x]) return over && !s.mine[y][x] ? "X" : "F";
  if (over && s.status === "lost" && s.mine[y][x]) return "*";
  return null;
}

function gRows(s) {
  var edge = "+" + rep("-", MW * 3) + "+";
  var rows = [edge];
  for (var y = 0; y < MH; y++) {
    var line = "|";
    for (var x = 0; x < MW; x++) {
      var t = cellText(s, x, y), here = x === s.cx && y === s.cy;
      if (t === null) t = "#";
      line += here ? "<" + t + ">" : " " + t + " ";
    }
    rows.push(line + "|");
  }
  rows.push(edge);
  if (s.status === "lost") banner(rows, "BOOM!");
  if (s.status === "won") banner(rows, "CLEARED!");
  return rows;
}

function gStatus(s) {
  if (s.status === "lost") return "BOOM! Click any square to try again";
  if (s.status === "won") return "Cleared in " + s.time + "s! Click any square for a new game";
  return "Mode: " + (s.mode === "dig" ? "DIG " : "FLAG") + "   Time: " + s.time + "s";
}
