var G_TICK = 90;
var G_RAW_KEYS = true;

var FW = 40;
var FH = 18;
var BIRD_X = 8;
var GAP = 5;
var PIPE_W = 3;
var PIPE_SPACING = 15;

function gNew() {
  return { y: 7, vy: 0, pipes: [], score: 0, status: "ready", wait: 0, t: 0 };
}

function flap(s) { s.vy = -1.3; }

function gTick(s) {
  if (s.status === "over") {
    if (s.wait > 0) s.wait--;
    return false;
  }
  s.t++;
  if (s.status === "ready") {
    // Bob gently while waiting.
    s.y = 7 + (s.t % 10 < 5 ? 0 : 1);
    return true;
  }
  s.vy = Math.min(1.2, s.vy + 0.35);
  s.y += s.vy;
  if (s.y < 0) { s.y = 0; s.vy = 0; }

  for (var i = 0; i < s.pipes.length; i++) s.pipes[i].x--;
  if (s.pipes.length && s.pipes[0].x + PIPE_W < 0) s.pipes.shift();
  var last = s.pipes[s.pipes.length - 1];
  if (!last || last.x < FW - PIPE_SPACING) s.pipes.push({ x: FW, top: 1 + rnd(FH - GAP - 3), scored: false });

  var row = Math.round(s.y);
  if (row >= FH - 1) { crash(s); return true; }
  for (i = 0; i < s.pipes.length; i++) {
    var p = s.pipes[i];
    if (p.x <= BIRD_X + 1 && p.x + PIPE_W - 1 >= BIRD_X && (row < p.top || row >= p.top + GAP)) { crash(s); return true; }
    if (!p.scored && p.x + PIPE_W - 1 < BIRD_X) { p.scored = true; s.score++; }
  }
  return true;
}

function crash(s) {
  s.status = "over";
  s.wait = 8;   // a short pause so a late tap doesn't restart right away
}

function gInput(s, kind) {
  if (kind === "cell") return null;
  if (s.status === "over") {
    if (s.wait > 0) return null;
    var fresh = gNew();
    fresh.status = "playing";
    flap(fresh);
    return fresh;
  }
  s.status = "playing";
  flap(s);
  return null;
}

function gRows(s) {
  var g = grid(FW, FH, " "), x, y;
  for (var i = 0; i < s.pipes.length; i++) {
    var p = s.pipes[i];
    for (y = 0; y < FH - 1; y++) {
      if (y >= p.top && y < p.top + GAP) continue;
      var lip = y === p.top - 1 || y === p.top + GAP;
      for (x = 0; x < PIPE_W; x++) {
        if (p.x + x >= 0 && p.x + x < FW) g[y][p.x + x] = lip ? "=" : "#";
      }
    }
  }
  for (x = 0; x < FW; x++) g[FH - 1][x] = x % 2 === s.t % 2 ? "/" : "_";
  var row = Math.max(0, Math.min(FH - 1, Math.round(s.y)));
  var bird = s.status === "over" ? "XX" : s.vy < 0 ? "^>" : "v>";
  g[row][BIRD_X] = bird.charAt(0);
  g[row][BIRD_X + 1] = bird.charAt(1);
  var rows = [];
  for (y = 0; y < FH; y++) rows.push(g[y].join(""));
  if (s.status === "ready") banner(rows, "TAP TO FLAP", 3);
  if (s.status === "over") banner(rows, "GAME OVER", 3);
  return rows;
}

function gStatus(s) {
  if (s.status === "over") return "Bonk! Tap FLAP or any key to try again";
  return "Tap FLAP, Up or any key to flap through the gaps";
}
