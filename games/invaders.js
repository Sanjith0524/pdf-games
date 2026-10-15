var G_TICK = 60;
var G_KEYS = { " ": "fire" };

var IW = 40;
var IH = 20;
var COLS = 8;
var ROWS = 5;
var GROUND = IH - 1;
var PLAYER_Y = IH - 2;
var SHIELD_Y = IH - 5;
var SHIELD_XS = [4, 14, 23, 32];
var LOOKS = [["<o>", ">o<"], ["{O}", "}O{"], ["{O}", "}O{"], ["/M\\", "\\M/"], ["/M\\", "\\M/"]];
var POINTS = [30, 20, 20, 10, 10];

function newWave(s) {
  s.alive = grid(COLS, ROWS, true);
  s.count = COLS * ROWS;
  s.fx = 2;
  s.fy = 1 + Math.min(3, s.wave - 1);
  s.fdir = 1;
  s.wait = 0;
  s.frame = 0;
  s.bombs = [];
  s.shot = null;
}

function gNew() {
  var s = { px: Math.floor(IW / 2) - 1, lives: 3, score: 0, wave: 1, status: "ready", dead: 0, shield: {} };
  for (var i = 0; i < SHIELD_XS.length; i++) {
    for (var dx = 0; dx < 4; dx++) {
      s.shield[(SHIELD_XS[i] + dx) + "," + SHIELD_Y] = true;
      s.shield[(SHIELD_XS[i] + dx) + "," + (SHIELD_Y + 1)] = true;
    }
  }
  newWave(s);
  return s;
}

function alienAt(s, x, y) {
  for (var j = 0; j < ROWS; j++) {
    if (y !== s.fy + j * 2) continue;
    for (var i = 0; i < COLS; i++) {
      var ax = s.fx + i * 4;
      if (s.alive[j][i] && x >= ax && x < ax + 3) return [i, j];
    }
  }
  return null;
}

function moveFleet(s) {
  var minI = COLS, maxI = -1, maxJ = -1;
  for (var j = 0; j < ROWS; j++) for (var i = 0; i < COLS; i++) {
    if (s.alive[j][i]) { minI = Math.min(minI, i); maxI = Math.max(maxI, i); maxJ = Math.max(maxJ, j); }
  }
  var left = s.fx + minI * 4 + s.fdir, right = s.fx + maxI * 4 + 2 + s.fdir;
  if (left < 0 || right >= IW) { s.fy++; s.fdir = -s.fdir; }
  else s.fx += s.fdir;
  s.frame = 1 - s.frame;
  var bottom = s.fy + maxJ * 2;
  // Aliens chew through shields they walk into.
  for (var key in s.shield) if (s.shield[key] && Number(key.split(",")[1]) <= bottom) s.shield[key] = false;
  if (bottom >= PLAYER_Y) { s.status = "over"; s.lives = 0; }
}

function dropBomb(s) {
  var cols = [];
  for (var i = 0; i < COLS; i++) {
    for (var j = ROWS - 1; j >= 0; j--) if (s.alive[j][i]) { cols.push([i, j]); break; }
  }
  if (!cols.length) return;
  var pick = cols[rnd(cols.length)];
  s.bombs.push({ x: s.fx + pick[0] * 4 + 1, y: s.fy + pick[1] * 2 + 1 });
}

function hitShield(s, x, y) {
  var key = x + "," + y;
  if (s.shield[key]) { s.shield[key] = false; return true; }
  return false;
}

function gTick(s) {
  if (s.status !== "playing") return false;
  s.tick = (s.tick || 0) + 1;
  if (s.dead > 0) {
    s.dead--;
    return true;
  }
  if (s.shot) {
    s.shot.y--;
    var a = alienAt(s, s.shot.x, s.shot.y);
    if (a) {
      s.alive[a[1]][a[0]] = false;
      s.count--;
      s.score += POINTS[a[1]];
      s.shot = null;
    } else if (s.shot.y < 0 || hitShield(s, s.shot.x, s.shot.y)) {
      s.shot = null;
    }
  }
  if (s.count === 0) {
    s.wave++;
    newWave(s);
    return true;
  }
  if (++s.wait >= 1 + Math.floor(s.count / 4)) {
    s.wait = 0;
    moveFleet(s);
    if (s.status === "over") return true;
  }
  if (s.bombs.length < 2 + s.wave && Math.random() < 0.05 + s.wave * 0.01) dropBomb(s);
  if (s.tick % 2 === 0) {
    var kept = [];
    for (var i = 0; i < s.bombs.length; i++) {
      var b = s.bombs[i];
      b.y++;
      if (hitShield(s, b.x, b.y) || b.y >= GROUND) continue;
      if (b.y === PLAYER_Y && b.x >= s.px && b.x < s.px + 3) {
        s.lives--;
        s.dead = 20;
        kept = [];
        if (s.lives === 0) s.status = "over";
        break;
      }
      kept.push(b);
    }
    s.bombs = kept;
  }
  return true;
}

function gInput(s, kind, a) {
  if (kind !== "dir" && kind !== "btn") return null;
  if (s.status === "over") return gNew();
  if (s.status === "ready") { s.status = "playing"; return null; }
  if (s.dead > 0) return null;
  if (a === "left") s.px = Math.max(0, s.px - 2);
  if (a === "right") s.px = Math.min(IW - 3, s.px + 2);
  if ((a === "up" || a === "fire") && !s.shot) s.shot = { x: s.px + 1, y: PLAYER_Y - 1 };
  return null;
}

function gRows(s) {
  var g = grid(IW, IH, " "), x, y, i, j;
  for (var key in s.shield) {
    if (!s.shield[key]) continue;
    var p = key.split(",");
    g[Number(p[1])][Number(p[0])] = "#";
  }
  for (j = 0; j < ROWS; j++) for (i = 0; i < COLS; i++) {
    if (!s.alive[j][i]) continue;
    var look = LOOKS[j][s.frame];
    y = s.fy + j * 2;
    for (x = 0; x < 3; x++) if (y < IH) g[y][s.fx + i * 4 + x] = look.charAt(x);
  }
  for (i = 0; i < s.bombs.length; i++) g[s.bombs[i].y][s.bombs[i].x] = "!";
  if (s.shot && s.shot.y >= 0) g[s.shot.y][s.shot.x] = "|";
  var ship = s.dead > 0 && s.dead % 4 < 2 ? "\\*/" : "/A\\";
  if (s.lives > 0 || s.dead > 0) for (x = 0; x < 3; x++) g[PLAYER_Y][s.px + x] = ship.charAt(x);
  for (x = 0; x < IW; x++) g[GROUND][x] = "=";
  var rows = [];
  for (y = 0; y < IH; y++) rows.push(g[y].join(""));
  if (s.status === "ready") banner(rows, "PRESS AN ARROW TO START", 12);
  if (s.status === "over") banner(rows, "GAME OVER", 12);
  return rows;
}

function gStatus(s) {
  if (s.status === "over") return "The invaders got you - press an arrow to retry";
  return "Ships: " + rep("A ", s.lives) + "  Wave " + s.wave + "   Up / FIRE shoots";
}
