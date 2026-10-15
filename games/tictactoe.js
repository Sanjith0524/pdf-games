var G_RAW_KEYS = true;
var G_KEYS = { n: "new", l: "level" };

var LINES = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
var ART = {
  X: ["         ", "  \\   /  ", "    X    ", "  /   \\  ", "         "],
  O: ["         ", "  .---.  ", "  |   |  ", "  '---'  ", "         "]
};
var starts = "you";

function gNew(prev) {
  var s = {
    b: ["", "", "", "", "", "", "", "", ""], status: "playing", win: null,
    score: prev ? prev.score : 0, cpu: prev ? prev.cpu : 0, draws: prev ? prev.draws : 0,
    hard: prev ? prev.hard : true
  };
  // Take turns going first.
  starts = prev ? (starts === "you" ? "cpu" : "you") : "you";
  if (starts === "cpu") cpuMove(s);
  return s;
}

function winner(b) {
  for (var i = 0; i < LINES.length; i++) {
    var l = LINES[i];
    if (b[l[0]] && b[l[0]] === b[l[1]] && b[l[1]] === b[l[2]]) return { who: b[l[0]], line: l };
  }
  for (i = 0; i < 9; i++) if (!b[i]) return null;
  return { who: "draw", line: [] };
}

// Minimax with alpha-beta pruning: O (the CPU) maximises, X minimises.
// Faster wins score higher.
function minimax(b, turn, depth, alpha, beta) {
  var w = winner(b);
  if (w) return w.who === "O" ? 10 - depth : w.who === "X" ? depth - 10 : 0;
  for (var i = 0; i < 9; i++) {
    if (b[i]) continue;
    b[i] = turn;
    var v = minimax(b, turn === "O" ? "X" : "O", depth + 1, alpha, beta);
    b[i] = "";
    if (turn === "O") { if (v > alpha) alpha = v; } else if (v < beta) beta = v;
    if (alpha >= beta) break;
  }
  return turn === "O" ? alpha : beta;
}

function cpuMove(s) {
  var free = [], i;
  for (i = 0; i < 9; i++) if (!s.b[i]) free.push(i);
  if (!free.length) return;
  var pick = free[rnd(free.length)];
  if (free.length === 9) {
    // Opening on an empty board: a corner or the centre is always safe.
    var openings = [0, 2, 4, 6, 8];
    pick = openings[rnd(openings.length)];
  } else if (s.hard || Math.random() < 0.5) {
    var bestV = -100;
    shuffle(free);
    for (i = 0; i < free.length; i++) {
      s.b[free[i]] = "O";
      var v = minimax(s.b, "X", 1, bestV, 100);
      s.b[free[i]] = "";
      if (v > bestV) { bestV = v; pick = free[i]; }
    }
  }
  s.b[pick] = "O";
}

function finish(s) {
  var w = winner(s.b);
  if (!w) return false;
  s.status = "over";
  s.win = w;
  if (w.who === "X") s.score++;
  else if (w.who === "O") s.cpu++;
  else s.draws++;
  return true;
}

function play(s, i) {
  if (s.status !== "playing" || s.b[i]) return null;
  s.b[i] = "X";
  if (!finish(s)) { cpuMove(s); finish(s); }
  return null;
}

function gInput(s, kind, a, b) {
  if (kind === "btn" && a === "new") return gNew(s);
  if (kind === "btn" && a === "level") { s.hard = !s.hard; return null; }
  if (s.status === "over" && (kind === "cell" || kind === "key")) return gNew(s);
  if (kind === "cell") return play(s, b * 3 + a);
  if (kind === "key" && a >= "1" && a <= "9") return play(s, Number(a) - 1);
  return null;
}

function gTick() { return false; }
function gBest(s) { return s.cpu; }

function gRows(s) {
  var rows = [];
  for (var r = 0; r < 3; r++) {
    for (var line = 0; line < 5; line++) {
      var parts = [];
      for (var c = 0; c < 3; c++) {
        var i = r * 3 + c, mark = s.b[i];
        var won = s.win && s.win.line.indexOf(i) >= 0;
        var text = mark ? ART[mark][line] : line === 2 ? "    " + (i + 1) + "    " : "         ";
        if (won && (line === 0 || line === 4)) text = " ======= ";
        parts.push(text);
      }
      rows.push(parts.join("|"));
    }
    if (r < 2) rows.push("---------+---------+---------");
  }
  return rows;
}

function gStatus(s) {
  var level = s.hard ? "HARD" : "EASY";
  if (s.status === "over") {
    var msg = s.win.who === "X" ? "You win!" : s.win.who === "O" ? "CPU wins." : "Draw.";
    return msg + " Draws: " + s.draws + ". Click the board to play again";
  }
  return "You are X - click a square or press 1-9. Level: " + level;
}
