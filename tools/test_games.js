// Runs every game outside a PDF viewer: loads the same JavaScript the PDF
// gets, with a fake form, then mashes random inputs and checks the screen.
//   node tools/test_games.js
var fs = require("fs");
var vm = require("vm");
var path = require("path");

var dir = path.join(__dirname, "..", "games");
var specs = JSON.parse(fs.readFileSync(path.join(dir, "games.json"), "utf8"));
var failures = 0;

function check(label, ok) {
  if (!ok) { console.log("  FAIL " + label); failures++; }
}

function seeded(seed) {
  return function () {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
}

function load(spec, seed) {
  var fields = {};
  var ctx = {
    getField: function (name) { return fields[name] || (fields[name] = { value: "" }); },
    app: { setInterval: function () { return {}; } },
    console: console
  };
  vm.createContext(ctx);
  vm.runInContext("Math.random = (" + seeded.toString() + ")(" + seed + ");", ctx);
  var code = "var G_ROWS = " + spec.rows + ";\nvar G_COLS = " + spec.cols + ";\n" +
    fs.readFileSync(path.join(dir, "lib.js"), "utf8") + "\n" +
    fs.readFileSync(path.join(dir, (spec.src || spec.id) + ".js"), "utf8") + "\n" +
    fs.readFileSync(path.join(dir, "platform.js"), "utf8");
  // Wrapped in a function because globals inside a node vm context are very
  // slow. The game code can't tell the difference.
  vm.runInContext("var api = (function () {\n" + code + "\nreturn { tick: tick, onArrow: onArrow, onBtn: onBtn, onKey: onKey, onCell: onCell, " +
    "gRows: gRows, state: function () { return S; }, ev: function (c) { return eval(c); } };\n})();", ctx, { filename: spec.id + ".js" });
  var api = ctx.api;
  api.fields = fields;
  return api;
}

function screen(ctx, spec) {
  var out = [];
  for (var i = 0; i < spec.rows; i++) out.push(ctx.fields["row" + i].value);
  return out;
}

// Raw rows must fit: wider rows would get cut off, more rows would vanish.
function checkScreen(ctx, spec, where) {
  var rows = ctx.gRows(ctx.state());
  if (rows.length > spec.rows) return "too many rows (" + rows.length + ") " + where;
  for (var i = 0; i < rows.length; i++) {
    if (typeof rows[i] !== "string") return "row " + i + " not a string " + where;
    if (rows[i].length > spec.cols) return "row " + i + " is " + rows[i].length + " wide (max " + spec.cols + ") " + where + "\n" + rows[i];
  }
  var status = ctx.fields.status.value;
  if (status.length > 62) return "status too long (" + status.length + "): " + status;
  if (String(ctx.fields.score.value).length > 6) return "score too wide: " + ctx.fields.score.value;
  if (String(ctx.fields.best.value).length > 6) return "best too wide: " + ctx.fields.best.value;
  return null;
}

function fuzz(spec, seed, steps) {
  var ctx = load(spec, seed);
  var rand = seeded(seed * 7 + 1);
  var dirs = ["up", "down", "left", "right"];
  var keys = "wasd 1234567890-abcdefghijklmnopqrstuvwxyz";
  var buttons = (spec.buttons || []).map(function (b) { return b[1]; });
  for (var i = 0; i < steps; i++) {
    var r = rand(), call, label;
    if (r < 0.45) { call = [ctx.tick]; label = "tick"; }
    else if (r < 0.6 && spec.dpad) { call = [ctx.onArrow, dirs[Math.floor(rand() * 4)]]; }
    else if (r < 0.7 && buttons.length) { call = [ctx.onBtn, buttons[Math.floor(rand() * buttons.length)]]; }
    else if (r < 0.8 && spec.kbd) { call = [ctx.onKey, keys.charAt(Math.floor(rand() * keys.length))]; }
    else if (spec.click) {
      var g = spec.click[Math.floor(rand() * spec.click.length)];
      call = [ctx.onCell, g.g, Math.floor(rand() * g.nx), Math.floor(rand() * g.ny)];
    } else { call = [ctx.tick]; }
    label = call[0].name + "(" + JSON.stringify(call.slice(1)).slice(1, -1) + ")";
    try {
      call[0].apply(null, call.slice(1));
    } catch (e) {
      return "threw on step " + i + " (" + label + "): " + e.stack.split("\n").slice(0, 3).join(" | ");
    }
    var bad = checkScreen(ctx, spec, "after " + label);
    if (bad) return bad;
  }
  return null;
}

function run(api, code) { return api.ev(code); }
function spec(id) { return specs.filter(function (s) { return s.id === id; })[0]; }

// ---------------------------------------------------------------- fuzz all
specs.forEach(function (s) {
  console.log(s.id);
  for (var seed = 1; seed <= 6; seed++) {
    var bad = fuzz(s, seed, 4000);
    check("fuzz seed " + seed + ": " + bad, !bad);
    if (bad) break;
  }
});

// ---------------------------------------------------------------- game rules
console.log("rules");

var t = load(spec("tetris"), 3);
run(t, 'onArrow("left")');
run(t, "for (var x = 0; x < BW - 1; x++) S.board[BH - 1][x] = 1;" +
  "S.cur = spawn(0); S.cur.cells = rotated(S.cur); S.cur.x = BW - 3; S.cur.y = 0; onBtn('drop');");
check("tetris: an I piece fills a line and clears it", run(t, "S.lines") === 1 && run(t, "S.score") > 100);
check("tetris: rows above drop down after a clear", run(t, "S.board[BH - 1].join('')") === "0000000001");

var g = load(spec("2048"), 2);
check("2048: 2 2 4 4 slides left to 4 8", JSON.stringify(run(g, "slide([2, 2, 4, 4]).line")) === "[4,8,0,0]");
check("2048: 2 2 2 merges only once", JSON.stringify(run(g, "slide([2, 2, 2, 0]).line")) === "[4,2,0,0]");
check("2048: starts with two tiles", run(g, "S.b.reduce(function (n, r) { return n + r.filter(Boolean).length; }, 0)") === 2);

var m = load(spec("minesweeper"), 4);
run(m, 'onCell("m", 5, 5)');
check("minesweeper: first click never hits a mine", run(m, "S.status") === "playing" && run(m, "S.open[5][5]"));
check("minesweeper: first click opens an area", run(m, "S.opened") > 1);
check("minesweeper: has the right mine count", run(m, "S.mine.reduce(function (n, r) { return n + r.filter(Boolean).length; }, 0)") === 18);

// Every Sokoban level must be solvable. Searches box pushes (not single
// steps), skipping boxes pushed into dead corners.
function solveSokoban(rows) {
  var w = 0, h = rows.length, wall = {}, goal = {}, boxes = [], start = null, x, y;
  rows.forEach(function (r) { w = Math.max(w, r.length); });
  for (y = 0; y < h; y++) for (x = 0; x < w; x++) {
    var c = rows[y].charAt(x) || " ", k = y * w + x;
    if (c === "#") wall[k] = true;
    if (c === "." || c === "*" || c === "+") goal[k] = true;
    if (c === "$" || c === "*") boxes.push(k);
    if (c === "@" || c === "+") start = k;
  }
  var steps = [1, -1, w, -w];
  function isWall(k) { return k < 0 || k >= w * h || wall[k]; }
  function dead(k) {
    if (goal[k]) return false;
    var up = isWall(k - w), down = isWall(k + w), left = isWall(k - 1), right = isWall(k + 1);
    return (up || down) && (left || right);
  }
  function reach(p, boxSet) {
    var seen = {}, todo = [p]; seen[p] = true;
    while (todo.length) {
      var c = todo.pop();
      for (var i = 0; i < 4; i++) {
        var n = c + steps[i];
        if (!seen[n] && !isWall(n) && !boxSet[n]) { seen[n] = true; todo.push(n); }
      }
    }
    return seen;
  }
  function key(p, b) { return Math.min.apply(null, Object.keys(reach(p, set(b))).map(Number)) + ":" + b.slice().sort(function (a, c) { return a - c; }).join(","); }
  function set(b) { var o = {}; b.forEach(function (k) { o[k] = true; }); return o; }
  var seen = {}, queue = [[start, boxes]];
  seen[key(start, boxes)] = true;
  while (queue.length) {
    var cur = queue.shift(), p = cur[0], b = cur[1], bs = set(b);
    if (b.every(function (k) { return goal[k]; })) return true;
    var can = reach(p, bs);
    for (var i = 0; i < b.length; i++) for (var d = 0; d < 4; d++) {
      var from = b[i] - steps[d], to = b[i] + steps[d];
      if (!can[from] || isWall(to) || bs[to] || dead(to)) continue;
      var nb = b.slice(); nb[i] = to;
      var k2 = key(b[i], nb);
      if (!seen[k2]) { seen[k2] = true; queue.push([b[i], nb]); }
    }
    if (Object.keys(seen).length > 300000) return "gave up";
  }
  return false;
}

var so = load(spec("sokoban"), 1);
run(so, "LEVELS").forEach(function (rows, L) {
  var result = solveSokoban(rows);
  check("sokoban: level " + (L + 1) + " is solvable (got " + result + ")", result === true);
});

// Pac-Man: every pellet reachable, ghosts can leave the house.
var pm = load(spec("pacman"), 1);
check("pacman: all maze rows are the same width", run(pm, "MAZE.every(function (r) { return r.length === MW; })"));
check("pacman: every pellet is reachable", run(pm, "(function () {" +
  "var seen = {}, todo = [[S.start.x, S.start.y]], n = 0; seen[S.start.x + ',' + S.start.y] = 1;" +
  "while (todo.length) { var c = todo.pop(); var ch = S.maze[c[1]][c[0]]; if (ch === '.' || ch === 'o') n++;" +
  "  DIR_NAMES.forEach(function (d) { var x = wrapX(c[0] + DIRV[d].x), y = c[1] + DIRV[d].y;" +
  "    if (playerCan(S, x, y) && !seen[x + ',' + y]) { seen[x + ',' + y] = 1; todo.push([x, y]); } }); }" +
  "return n === S.pellets; })()"));
run(pm, 'onArrow("left")');
for (var i = 0; i < 60; i++) run(pm, "if (S.status === 'playing') tick()");
check("pacman: ghosts leave the house", run(pm, "S.ghosts.some(function (g) { return !inHouse(g) && g.y < 9; })"));

// Tic-tac-toe on HARD: the player should never win, whatever they click.
var losses = 0;
for (var seed = 1; seed <= 80; seed++) {
  var tt = load(spec("tictactoe"), seed);
  var r = seeded(seed);
  for (var game = 0; game < 4; game++) {
    for (var k = 0; k < 20 && run(tt, "S.status") === "playing"; k++) run(tt, "onCell('t'," + Math.floor(r() * 3) + "," + Math.floor(r() * 3) + ")");
    if (run(tt, "S.win && S.win.who") === "X") losses++;
    run(tt, "onBtn('new')");
  }
}
check("tictactoe: the HARD CPU never loses to random play (" + losses + " losses)", losses === 0);

var c4 = load(spec("connect4"), 1);
run(c4, "S.b = grid(CW, CH, ''); S.b[5][0] = S.b[5][1] = S.b[5][2] = 'X'; S.status = 'playing';");
run(c4, "cpuMove(S)");
check("connect4: CPU blocks an open three", run(c4, "S.b[5][3]") === "O");
run(c4, "S.b = grid(CW, CH, ''); S.b[5][0] = S.b[5][1] = S.b[5][2] = 'O'; S.b[4][0] = 'X'; S.b[4][1] = 'X';");
run(c4, "cpuMove(S)");
check("connect4: CPU takes a winning move", run(c4, "findWin(S.b) && findWin(S.b).who") === "O");
var started = Date.now();
run(c4, "S = gNew(); S.hard = true; play(S, 3); play(S, 2); play(S, 4);");
check("connect4: three HARD replies take under 1.5s in node (" + (Date.now() - started) + "ms)", Date.now() - started < 1500);

var lo = load(spec("lightsout"), 5);
check("lightsout: starts with lights on", run(lo, "lit(S)") >= 6);
run(lo, "S.on = grid(LN, LN, false); press(S, 2, 2); onCell('l', 2, 2)");
check("lightsout: pressing the same square twice undoes it", run(lo, "S.status") === "won");

var ff = load(spec("fifteen"), 5);
check("fifteen: starts shuffled", !run(ff, "solved(S)"));
run(ff, "S.b = [[1,2,3,4],[5,6,7,8],[9,10,11,12],[13,14,0,15]]; S.ex = 2; S.ey = 3; S.score = 0; onArrow('left')");
check("fifteen: Left slides 15 into the gap and solves it", run(ff, "S.status") === "won" && run(ff, "S.score") === 1);

var mm = load(spec("mastermind"), 1);
check("mastermind: 1122 vs 1212 = **oo", run(mm, "mark(['1','1','2','2'], ['1','2','1','2'])") === "**oo");
check("mastermind: 1234 vs 5555 = ....", run(mm, "mark(['1','2','3','4'], ['5','5','5','5'])") === "....");
check("mastermind: 1123 vs 1111 = **..", run(mm, "mark(['1','1','2','3'], ['1','1','1','1'])") === "**..");

var wd = load(spec("wordle"), 1);
check("wordle: SPEED vs ERASE marks", JSON.stringify(run(wd, "scoreGuess('SPEED', 'ERASE')")) === "[1,0,0,1,1]");
check("wordle: every answer is 5 letters", run(wd, "ANSWERS.every(function (w) { return /^[A-Z]{5}$/.test(w); })"));
run(wd, "S.answer = 'CRANE'; onKey('crane'); onBtn('enter')");
check("wordle: typing the answer wins", run(wd, "S.status") === "won" && run(wd, "S.score") === 1);

var hg = load(spec("hangman"), 1);
check("hangman: every word is A-Z", run(hg, "WORDS.every(function (w) { return /^[A-Z]+$/.test(w); })"));
run(hg, "S.word = 'KOALA'; onKey('koal')");
check("hangman: guessing all letters wins", run(hg, "S.status") === "won");

var lf = load(spec("life"), 1);
run(lf, "S.cells = grid(LW, LH, false); S.cells[5][5] = S.cells[5][6] = S.cells[5][7] = true; S.running = false; onBtn('step')");
check("life: a blinker flips upright", run(lf, "S.cells[4][6] && S.cells[6][6] && !S.cells[5][5]"));

var sm = load(spec("simon"), 2);
run(sm, "onArrow('up')");
for (i = 0; i < 40; i++) run(sm, "tick()");
check("simon: shows the pattern then waits for you", run(sm, "S.phase") === "input");
run(sm, "onArrow(PADS[S.seq[0]].dir)");
check("simon: the right pad scores a round", run(sm, "S.score") === 1);

var tr = load(spec("tron"), 2);
run(tr, "onArrow('up')");
for (i = 0; i < 400 && run(tr, "S.status") === "playing"; i++) run(tr, "tick()");
check("tron: a round ends", run(tr, "S.status") === "over");

console.log(failures ? failures + " FAILED" : "all passed");
process.exitCode = failures ? 1 : 0;
