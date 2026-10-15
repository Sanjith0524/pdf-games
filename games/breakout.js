var G_TICK = 80;
var G_KEYS = { " ": "launch" };

var FW = 40;
var FH = 22;
var BRICK_TOP = 2;
var BRICK_ROWS = 5;
var BRICK_W = 4;
var PADDLE_Y = 20;
var PADDLE_W = 8;
var BRICK_LOOK = ["[##]", "[==]", "[::]", "[--]", "[..]"];
var BRICK_POINTS = [25, 20, 15, 10, 5];

function newBricks() {
  return grid(FW / BRICK_W, BRICK_ROWS, true);
}

function gNew() {
  var s = { bricks: newBricks(), left: (FW / BRICK_W) * BRICK_ROWS, px: (FW - PADDLE_W) / 2, lives: 3, score: 0, level: 1, status: "ready" };
  stick(s);
  return s;
}

function stick(s) {
  s.stuck = true;
  s.bx = s.px + PADDLE_W / 2;
  s.by = PADDLE_Y - 1;
  s.dx = 1; s.dy = -1;
}

function brickAt(s, x, y) {
  var r = y - BRICK_TOP;
  if (r < 0 || r >= BRICK_ROWS || x < 0 || x >= FW) return false;
  return s.bricks[r][Math.floor(x / BRICK_W)];
}

function hit(s, x, y) {
  var r = y - BRICK_TOP;
  s.bricks[r][Math.floor(x / BRICK_W)] = false;
  s.score += BRICK_POINTS[r];
  s.left--;
}

function solid(s, x, y) {
  return x < 0 || x >= FW || y < 0 || brickAt(s, x, y);
}

function moveBall(s) {
  var x = s.bx, y = s.by;
  if (x + s.dx < 0 || x + s.dx >= FW) s.dx = -s.dx;
  if (y + s.dy < 0) s.dy = -s.dy;
  if (brickAt(s, x, y + s.dy)) { hit(s, x, y + s.dy); s.dy = -s.dy; }
  else if (brickAt(s, x + s.dx, y)) { hit(s, x + s.dx, y); s.dx = -s.dx; }
  else if (brickAt(s, x + s.dx, y + s.dy)) { hit(s, x + s.dx, y + s.dy); s.dx = -s.dx; s.dy = -s.dy; }

  if (s.dy > 0 && y + s.dy === PADDLE_Y && x + s.dx >= s.px - 1 && x + s.dx <= s.px + PADDLE_W) {
    s.dy = -1;
    s.dx = x + s.dx < s.px + PADDLE_W / 2 ? -1 : 1;
  }
  var nx = x + s.dx, ny = y + s.dy;
  // If bouncing pointed us into something else, wait a tick instead.
  if (solid(s, nx, ny)) return;
  s.bx = nx; s.by = ny;
}

function gTick(s) {
  if (s.status !== "playing" || s.stuck) return false;
  moveBall(s);
  if (s.left === 0) {
    s.bricks = newBricks();
    s.left = (FW / BRICK_W) * BRICK_ROWS;
    s.level++;
    stick(s);
  } else if (s.by >= FH) {
    s.lives--;
    if (s.lives === 0) s.status = "over";
    else stick(s);
  }
  return true;
}

function gInput(s, kind, a) {
  if (s.status === "over") return kind === "dir" || kind === "btn" ? gNew() : null;
  if (kind === "dir" && (a === "left" || a === "right")) {
    s.px = Math.max(0, Math.min(FW - PADDLE_W, s.px + (a === "left" ? -3 : 3)));
    if (s.stuck) s.bx = s.px + PADDLE_W / 2;
  } else if ((kind === "dir" && a === "up") || (kind === "btn" && a === "launch")) {
    s.status = "playing";
    if (s.stuck) { s.stuck = false; s.dx = Math.random() < 0.5 ? -1 : 1; s.dy = -1; }
  }
  return null;
}

function gRows(s) {
  var rows = ["+" + rep("-", FW) + "+"];
  for (var y = 0; y < FH; y++) {
    var line = "";
    for (var x = 0; x < FW; x++) {
      var c = " ";
      if (brickAt(s, x, y)) c = BRICK_LOOK[y - BRICK_TOP].charAt(x % BRICK_W);
      if (y === PADDLE_Y && x >= s.px && x < s.px + PADDLE_W) c = "=";
      if (x === s.bx && y === s.by) c = "O";
      line += c;
    }
    rows.push("|" + line + "|");
  }
  if (s.status === "ready") banner(rows, "PRESS UP TO LAUNCH", 13);
  if (s.status === "over") banner(rows, "GAME OVER", 13);
  return rows;
}

function gStatus(s) {
  if (s.status === "over") return "Out of balls - press an arrow to play again";
  var hearts = "Balls: " + rep("O ", s.lives) + "  Level " + s.level;
  return s.stuck ? hearts + "  - Up / LAUNCH" : hearts;
}
