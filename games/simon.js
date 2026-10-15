var G_TICK = 100;

var PAD_W = 10;
var PAD_H = 4;
// Pads sit in a diamond, matching the arrow buttons.
var PADS = [
  { dir: "up",    label: "UP",    row: 0,  col: 12 },
  { dir: "left",  label: "LEFT",  row: 5,  col: 0 },
  { dir: "right", label: "RIGHT", row: 5,  col: 24 },
  { dir: "down",  label: "DOWN",  row: 10, col: 12 }
];

function gNew() {
  return { seq: [], pos: 0, phase: "ready", lit: -1, timer: 0, idx: 0, score: 0, missed: -1 };
}

function padIndex(dir) {
  for (var i = 0; i < PADS.length; i++) if (PADS[i].dir === dir) return i;
  return -1;
}

function nextRound(s) {
  s.seq.push(rnd(4));
  s.phase = "show";
  s.idx = 0;
  s.timer = 6;
  s.lit = -1;
}

// Pads flash a little quicker every few rounds.
function onTicks(s) { return Math.max(2, 5 - Math.floor(s.seq.length / 5)); }

function gTick(s) {
  if (s.timer > 0) { s.timer--; return false; }
  if (s.phase === "show") {
    if (s.lit >= 0) {
      s.lit = -1;
      s.idx++;
      s.timer = 1;
    } else if (s.idx < s.seq.length) {
      s.lit = s.seq[s.idx];
      s.timer = onTicks(s);
    } else {
      s.phase = "input";
      s.pos = 0;
    }
    return true;
  }
  if (s.phase === "input" && s.lit >= 0) { s.lit = -1; return true; }
  if (s.phase === "next") { nextRound(s); return true; }
  return false;
}

function press(s, pad) {
  if (s.phase === "ready" || s.phase === "over") {
    var fresh = gNew();
    nextRound(fresh);
    return fresh;
  }
  if (s.phase !== "input") return null;
  s.lit = pad;
  s.timer = 2;
  if (pad !== s.seq[s.pos]) {
    s.phase = "over";
    s.missed = s.seq[s.pos];
    s.lit = s.missed;
    return null;
  }
  s.pos++;
  if (s.pos === s.seq.length) {
    s.score = s.seq.length;
    s.phase = "next";
    s.timer = 8;
  }
  return null;
}

function gInput(s, kind, a, b, group) {
  if (kind === "dir") return press(s, padIndex(a));
  if (kind === "cell") return press(s, padIndex(group));
  if (kind === "btn" && a === "start" && (s.phase === "ready" || s.phase === "over")) return press(s, -1);
  return null;
}

function padRows(i, lit) {
  var p = PADS[i];
  if (lit) {
    var full = rep("#", PAD_W);
    return [full, overlay(full, " " + p.label + " ", Math.floor((PAD_W - p.label.length - 2) / 2)), full, full];
  }
  var edge = "+" + rep("-", PAD_W - 2) + "+";
  return [edge, "|" + mid(p.label, PAD_W - 2) + "|", "|" + rep(" ", PAD_W - 2) + "|", edge];
}

function gRows(s) {
  var rows = [];
  for (var r = 0; r < 14; r++) rows.push(rep(" ", 34));
  for (var i = 0; i < PADS.length; i++) {
    var art = padRows(i, s.lit === i);
    for (var k = 0; k < PAD_H; k++) rows[PADS[i].row + k] = overlay(rows[PADS[i].row + k], art[k], PADS[i].col);
  }
  var centre = s.phase === "ready" ? "START" : s.phase === "over" ? "OOPS!" : "ROUND " + s.seq.length;
  rows[6] = overlay(rows[6], mid(centre, 12), 11);
  rows[7] = overlay(rows[7], mid(s.phase === "show" ? "watch..." : s.phase === "input" ? "your turn" : "", 12), 11);
  return rows;
}

function gStatus(s) {
  if (s.phase === "ready") return "Press any arrow or pad to start";
  if (s.phase === "over") return "Wrong! It was " + PADS[s.missed].label + ". Press a pad to retry";
  if (s.phase === "show") return "Watch the pattern...";
  if (s.phase === "input") return "Repeat it: " + s.pos + " of " + s.seq.length;
  return "Nice! Get ready for the next round";
}
