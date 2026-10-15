var G_TICK = 200;
var G_KEYS = { " ": "play", n: "step", r: "random", c: "clear", p: "pattern" };

var LW = 20;
var LH = 15;
var PATTERNS = [
  { name: "Glider", rows: [".#.", "..#", "###"] },
  { name: "Spaceship", rows: [".#..#", "#....", "#...#", "####."] },
  { name: "Pulsar", rows: [
    "..###...###..", ".............", "#....#.#....#", "#....#.#....#", "#....#.#....#", "..###...###..",
    ".............", "..###...###..", "#....#.#....#", "#....#.#....#", "#....#.#....#", ".............", "..###...###.."] },
  { name: "Pentadecathlon", rows: ["..#....#..", "##.####.##", "..#....#.."] },
  { name: "R-pentomino", rows: [".##", "##.", ".#."] }
];

function gNew() {
  var s = { cells: grid(LW, LH, false), running: true, score: 0, pattern: -1 };
  randomize(s);
  return s;
}

function population(s) {
  var n = 0;
  for (var y = 0; y < LH; y++) for (var x = 0; x < LW; x++) if (s.cells[y][x]) n++;
  return n;
}

function randomize(s) {
  for (var y = 0; y < LH; y++) for (var x = 0; x < LW; x++) s.cells[y][x] = Math.random() < 0.3;
  s.score = 0;
}

function place(s, p) {
  s.cells = grid(LW, LH, false);
  var ox = Math.floor((LW - p.rows[0].length) / 2), oy = Math.floor((LH - p.rows.length) / 2);
  for (var y = 0; y < p.rows.length; y++) for (var x = 0; x < p.rows[y].length; x++) {
    if (p.rows[y].charAt(x) === "#") s.cells[oy + y][ox + x] = true;
  }
  s.score = 0;
}

// One generation. The edges wrap around, like a doughnut.
function step(s) {
  var next = grid(LW, LH, false);
  for (var y = 0; y < LH; y++) for (var x = 0; x < LW; x++) {
    var n = 0;
    for (var dy = -1; dy <= 1; dy++) for (var dx = -1; dx <= 1; dx++) {
      if ((dx || dy) && s.cells[(y + dy + LH) % LH][(x + dx + LW) % LW]) n++;
    }
    next[y][x] = n === 3 || (n === 2 && s.cells[y][x]);
  }
  s.cells = next;
  s.score++;
}

function gTick(s) {
  if (!s.running) return false;
  step(s);
  return true;
}

function gInput(s, kind, a, b) {
  if (kind === "cell") { s.cells[b][a] = !s.cells[b][a]; return null; }
  if (kind !== "btn") return null;
  if (a === "play") s.running = !s.running;
  if (a === "step") { s.running = false; step(s); }
  if (a === "random") randomize(s);
  if (a === "clear") { s.cells = grid(LW, LH, false); s.running = false; s.score = 0; }
  if (a === "pattern") {
    s.pattern = (s.pattern + 1) % PATTERNS.length;
    place(s, PATTERNS[s.pattern]);
  }
  return null;
}

function gBest(s) { return population(s); }

function gRows(s) {
  var rows = [];
  for (var y = 0; y < LH; y++) {
    var line = "";
    for (var x = 0; x < LW; x++) line += s.cells[y][x] ? "[]" : " .";
    rows.push(line);
  }
  return rows;
}

function gStatus(s) {
  var what = s.pattern >= 0 ? PATTERNS[s.pattern].name : "Random soup";
  return (s.running ? "Running" : "Paused") + " - " + what + ". Click squares to draw";
}
