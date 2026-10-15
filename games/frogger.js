var G_TICK = 100;

var FW = 16;
var START_Y = 11;
var SLOTS = [1, 4, 7, 11, 14];

// Each lane scrolls its pattern one square every `period` ticks.
//   L = log, C = car, T = truck, . = water / road
var LANES = [
  null,
  { kind: "river", dir: 1,  period: 5, pattern: "LLLL...LLL...LL." },
  { kind: "river", dir: -1, period: 4, pattern: "LLL..LLL...LLLL." },
  { kind: "river", dir: 1,  period: 6, pattern: "LLLLL...LLLL...." },
  { kind: "river", dir: -1, period: 3, pattern: "LLL...LLL..LLL.." },
  null,
  { kind: "road",  dir: -1, period: 4, pattern: "C...C.....C....." },
  { kind: "road",  dir: 1,  period: 3, pattern: "TTT.......TT...." },
  { kind: "road",  dir: -1, period: 5, pattern: "C..C......C..C.." },
  { kind: "road",  dir: 1,  period: 2, pattern: "C.........C....." },
  { kind: "road",  dir: -1, period: 6, pattern: "TTTT.......C...." },
  null
];

function gNew() {
  var s = { score: 0, lives: 3, level: 1, status: "ready", filled: [], offset: [], count: [], dead: 0 };
  for (var i = 0; i < LANES.length; i++) { s.offset.push(0); s.count.push(0); }
  for (i = 0; i < SLOTS.length; i++) s.filled.push(false);
  resetFrog(s);
  return s;
}

function resetFrog(s) {
  s.fx = Math.floor(FW / 2);
  s.fy = START_Y;
  s.reached = START_Y;
}

function laneAt(s, lane, x) {
  var L = LANES[lane], p = L.pattern, n = p.length;
  return p.charAt((((x - s.offset[lane]) % n) + n) % n);
}

function die(s) {
  s.lives--;
  s.dead = 10;
  s.deadAt = [s.fx, s.fy];
  if (s.lives === 0) s.status = "over";
}

function check(s) {
  var lane = LANES[s.fy];
  if (s.fy === 0) {
    var slot = -1;
    for (var i = 0; i < SLOTS.length; i++) if (SLOTS[i] === s.fx) slot = i;
    if (slot < 0 || s.filled[slot]) { die(s); return; }
    s.filled[slot] = true;
    s.score += 50;
    var all = true;
    for (i = 0; i < s.filled.length; i++) if (!s.filled[i]) all = false;
    if (all) {
      s.score += 200;
      s.level++;
      for (i = 0; i < s.filled.length; i++) s.filled[i] = false;
    }
    resetFrog(s);
    return;
  }
  if (!lane) return;
  var here = laneAt(s, s.fy, s.fx);
  if (lane.kind === "road" && here !== ".") die(s);
  if (lane.kind === "river" && here === ".") die(s);
}

function gTick(s) {
  if (s.status !== "playing") return false;
  if (s.dead > 0) {
    if (--s.dead === 0 && s.status === "playing") resetFrog(s);
    return true;
  }
  var changed = false;
  for (var i = 0; i < LANES.length; i++) {
    var L = LANES[i];
    if (!L) continue;
    if (++s.count[i] < Math.max(1, L.period - Math.floor((s.level - 1) / 2))) continue;
    s.count[i] = 0;
    s.offset[i] += L.dir;
    changed = true;
    // A frog sitting on a log rides along with it.
    if (L.kind === "river" && s.fy === i) {
      s.fx += L.dir;
      if (s.fx < 0 || s.fx >= FW) { s.fx = Math.max(0, Math.min(FW - 1, s.fx)); die(s); return true; }
    }
  }
  if (changed) check(s);
  return changed;
}

function gInput(s, kind, a) {
  if (kind !== "dir") return null;
  if (s.status === "over") return gNew();
  if (s.status === "ready") s.status = "playing";
  if (s.dead > 0) return null;
  var d = DIRV[a];
  s.fx = Math.max(0, Math.min(FW - 1, s.fx + d.x));
  s.fy = Math.max(0, Math.min(START_Y, s.fy + d.y));
  if (s.fy < s.reached) { s.reached = s.fy; s.score += 10; }
  check(s);
  return null;
}

function gRows(s) {
  var rows = [];
  for (var y = 0; y <= START_Y; y++) {
    var line = "", L = LANES[y];
    for (var x = 0; x < FW; x++) {
      var cell;
      if (y === 0) {
        var slot = -1;
        for (var i = 0; i < SLOTS.length; i++) if (SLOTS[i] === x) slot = i;
        cell = slot < 0 ? "##" : s.filled[slot] ? "@@" : "  ";
      } else if (!L) {
        cell = "::";
      } else {
        var c = laneAt(s, y, x);
        if (L.kind === "river") cell = c === "L" ? "==" : "~~";
        else cell = c === "C" ? (L.dir > 0 ? "[>" : "<]") : c === "T" ? "##" : "  ";
      }
      if (s.dead > 0 && s.deadAt[0] === x && s.deadAt[1] === y) cell = "XX";
      else if (s.dead === 0 && s.status !== "over" && x === s.fx && y === s.fy) cell = "@@";
      line += cell;
    }
    rows.push(line);
  }
  if (s.status === "ready") banner(rows, "PRESS AN ARROW", 5);
  if (s.status === "over") banner(rows, "GAME OVER", 5);
  return rows;
}

function gStatus(s) {
  if (s.status === "over") return "Splat! Press an arrow to play again";
  return "Frogs: " + rep("@ ", s.lives) + "  Level " + s.level + "   Fill the 5 homes at the top";
}
