var G_TICK = 150;
var TW = 20;
var TH = 15;

function gNew(prev) {
  return {
    trail: grid(TW, TH, 0),
    p: { x: 4, y: 7, dir: "right", next: "right" },
    c: { x: TW - 5, y: 7, dir: "left" },
    score: prev ? prev.score : 0, cpu: prev ? prev.cpu : 0,
    status: "ready", crash: []
  };
}

function blocked(s, x, y) {
  return x < 0 || y < 0 || x >= TW || y >= TH || s.trail[y][x] !== 0;
}

// How many empty squares can be reached from (x, y)? The CPU steers toward
// the biggest open area so it doesn't trap itself.
function space(s, x, y) {
  if (blocked(s, x, y)) return 0;
  var seen = {}, todo = [[x, y]], n = 0;
  seen[x + "," + y] = true;
  while (todo.length) {
    var c = todo.pop();
    n++;
    for (var i = 0; i < 4; i++) {
      var d = DIRV[DIR_NAMES[i]], nx = c[0] + d.x, ny = c[1] + d.y, key = nx + "," + ny;
      if (!seen[key] && !blocked(s, nx, ny)) { seen[key] = true; todo.push([nx, ny]); }
    }
  }
  return n;
}

function cpuTurn(s) {
  var c = s.c, bestDir = c.dir, bestScore = -1;
  for (var i = 0; i < 4; i++) {
    var dir = DIR_NAMES[i];
    if (dir === OPP[c.dir]) continue;
    var d = DIRV[dir], score = space(s, c.x + d.x, c.y + d.y);
    if (score === 0) continue;
    // Prefer heading toward the player a little, and keep going straight.
    score += dir === c.dir ? 3 : 0;
    score += Math.random() * 4;
    var toward = Math.abs(c.x + d.x - s.p.x) + Math.abs(c.y + d.y - s.p.y);
    score -= toward * 0.5;
    if (score > bestScore) { bestScore = score; bestDir = dir; }
  }
  c.dir = bestDir;
}

function gTick(s) {
  if (s.status !== "playing") return false;
  s.p.dir = s.p.next;
  cpuTurn(s);
  var pd = DIRV[s.p.dir], cd = DIRV[s.c.dir];
  var px = s.p.x + pd.x, py = s.p.y + pd.y, cx = s.c.x + cd.x, cy = s.c.y + cd.y;
  var pDead = blocked(s, px, py), cDead = blocked(s, cx, cy);
  if (px === cx && py === cy) pDead = cDead = true;
  if (!pDead) { s.p.x = px; s.p.y = py; s.trail[py][px] = 1; }
  if (!cDead) { s.c.x = cx; s.c.y = cy; s.trail[cy][cx] = 2; }
  if (pDead || cDead) {
    s.status = "over";
    if (pDead) s.crash.push([s.p.x, s.p.y]);
    if (cDead) s.crash.push([s.c.x, s.c.y]);
    s.result = pDead && cDead ? "draw" : pDead ? "lost" : "won";
    if (s.result === "won") s.score++;
    if (s.result === "lost") s.cpu++;
  }
  return true;
}

function gInput(s, kind, a) {
  if (kind !== "dir") return null;
  if (s.status !== "playing") {
    var fresh = s.status === "ready" ? s : gNew(s);
    fresh.status = "playing";
    fresh.trail[fresh.p.y][fresh.p.x] = 1;
    fresh.trail[fresh.c.y][fresh.c.x] = 2;
    if (a !== "left") fresh.p.next = a;
    return fresh;
  }
  if (a !== OPP[s.p.dir]) s.p.next = a;
  return null;
}

function gBest(s) { return s.cpu; }

function gRows(s) {
  var wall = rep("::", TW + 2), rows = [wall];
  for (var y = 0; y < TH; y++) {
    var line = "::";
    for (var x = 0; x < TW; x++) {
      var t = s.trail[y][x], cell = t === 1 ? "[]" : t === 2 ? "()" : "  ";
      if (x === s.p.x && y === s.p.y) cell = "@@";
      if (x === s.c.x && y === s.c.y) cell = "&&";
      for (var i = 0; i < s.crash.length; i++) if (s.crash[i][0] === x && s.crash[i][1] === y) cell = "XX";
      line += cell;
    }
    rows.push(line + "::");
  }
  rows.push(wall);
  if (s.status === "ready") banner(rows, "READY?", 4);
  if (s.status === "over") banner(rows, s.result === "won" ? "YOU WIN!" : s.result === "lost" ? "CPU WINS" : "DRAW", 4);
  return rows;
}

function gStatus(s) {
  if (s.status === "ready") return "You are @@ []. Trap the CPU &&. Arrow to start";
  if (s.status === "over") return "Round over - press an arrow for the next one";
  return "Don't hit a wall or any trail!";
}
