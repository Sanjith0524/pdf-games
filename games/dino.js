var G_TICK = 60;
var G_KEYS = { " ": "jump" };

var DW = 44;
var DH = 9;
var GROUND_Y = DH - 1;
var DINO_X = 4;

function gNew() {
  return { y: 0, vy: 0, duck: 0, obs: [], gap: 20, acc: 0, speed: 0.6, dist: 0, score: 0, status: "ready", wait: 0, t: 0 };
}

// Levels count up from the ground: level 0 is the row just above it.
function rowOf(level) { return GROUND_Y - 1 - level; }

function dinoLevels(s) {
  var base = Math.round(s.y);
  return s.duck > 0 && base === 0 ? [0] : [base, base + 1];
}

function spawn(s) {
  if (s.dist > 150 && Math.random() < 0.3) {
    s.obs.push({ x: DW, w: 2, levels: [1], bird: true });
  } else {
    var h = 1 + rnd(2), w = 1 + rnd(2), levels = [];
    for (var i = 0; i < h; i++) levels.push(i);
    s.obs.push({ x: DW, w: w, levels: levels, bird: false });
  }
  s.gap = 14 + rnd(14);
}

function collides(s) {
  var mine = dinoLevels(s);
  for (var i = 0; i < s.obs.length; i++) {
    var o = s.obs[i];
    if (o.x > DINO_X + 1 || o.x + o.w - 1 < DINO_X) continue;
    for (var a = 0; a < mine.length; a++) for (var b = 0; b < o.levels.length; b++) if (mine[a] === o.levels[b]) return true;
  }
  return false;
}

function gTick(s) {
  s.t++;
  if (s.status === "over") { if (s.wait > 0) s.wait--; return false; }
  if (s.status !== "playing") return false;
  if (s.y > 0 || s.vy > 0) {
    s.y += s.vy;
    s.vy -= 0.17;
    if (s.y <= 0) { s.y = 0; s.vy = 0; }
  }
  if (s.duck > 0) s.duck--;
  s.speed = Math.min(1, s.speed + 0.0006);
  s.acc += s.speed;
  while (s.acc >= 1) {
    s.acc -= 1;
    s.dist++;
    for (var i = 0; i < s.obs.length; i++) s.obs[i].x--;
    if (s.obs.length && s.obs[0].x + s.obs[0].w < 0) s.obs.shift();
    if (--s.gap <= 0) spawn(s);
    if (collides(s)) { s.status = "over"; s.wait = 10; break; }
  }
  s.score = Math.floor(s.dist / 2);
  return true;
}

function gInput(s, kind, a) {
  if (kind !== "dir" && kind !== "btn") return null;
  if (s.status === "over") {
    if (s.wait > 0) return null;
    s = gNew();
    s.status = "playing";
    return s;
  }
  s.status = "playing";
  if (a === "up" || a === "jump") {
    if (s.y === 0) { s.vy = 1.15; s.y = 0.01; s.duck = 0; }
  } else if (a === "down") {
    if (s.y > 0) s.vy = -1;
    else s.duck = 8;
  }
  return null;
}

function gRows(s) {
  var g = grid(DW, DH, " "), x, i, b;
  for (x = 0; x < DW; x++) g[GROUND_Y][x] = (x + s.dist) % 7 === 0 ? "." : "_";
  for (i = 0; i < s.obs.length; i++) {
    var o = s.obs[i];
    for (b = 0; b < o.levels.length; b++) {
      var look = o.bird ? (s.t % 8 < 4 ? "<v" : "<^") : o.w === 2 ? "||" : "|";
      if (!o.bird && b === o.levels.length - 1) look = o.w === 2 ? "Y|" : "Y";
      for (x = 0; x < o.w; x++) {
        var cx = o.x + x;
        if (cx >= 0 && cx < DW) g[rowOf(o.levels[b])][cx] = look.charAt(x);
      }
    }
  }
  var levels = dinoLevels(s);
  var crashed = s.status === "over";
  if (levels.length === 1) {
    g[rowOf(0)][DINO_X] = "o"; g[rowOf(0)][DINO_X + 1] = "=";
  } else {
    var legs = s.y > 0 ? "/\\" : s.t % 4 < 2 ? "/|" : "|\\";
    var top = rowOf(levels[1]), bottom = rowOf(levels[0]);
    if (top >= 0) { g[top][DINO_X] = crashed ? "x" : "O"; g[top][DINO_X + 1] = ">"; }
    if (bottom >= 0) { g[bottom][DINO_X] = legs.charAt(0); g[bottom][DINO_X + 1] = legs.charAt(1); }
  }
  var rows = [];
  for (var y = 0; y < DH; y++) rows.push(g[y].join(""));
  if (s.status === "ready") banner(rows, "PRESS UP TO RUN", 2);
  if (crashed) banner(rows, "GAME OVER", 2);
  return rows;
}

function gStatus(s) {
  if (s.status === "over") return "Ouch! Press Up / JUMP to run again";
  return "Up / JUMP hops the cactus, Down ducks the birds";
}
