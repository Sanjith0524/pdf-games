var G_KEYS = { u: "undo", r: "restart", n: "skip" };

// # wall   . goal   $ box   * box on goal   @ player   + player on goal
var LEVELS = [
  [
    "#####",
    "#@  #",
    "# $ #",
    "#  .#",
    "#####"
  ],
  [
    "######",
    "#    #",
    "# $$ #",
    "#  @ #",
    "#.  .#",
    "######"
  ],
  [
    "########",
    "#  .   #",
    "# $$$  #",
    "#. @ .##",
    "#  #  #",
    "########"
  ],
  [
    "  ####",
    "###  ####",
    "#     $ #",
    "# #  #$ #",
    "# . .#@ #",
    "#########"
  ],
  [
    " #######",
    " #  .  #",
    "## $#$ #",
    "#  . @ #",
    "# $#.  #",
    "#      #",
    "########"
  ],
  [
    "  #####",
    "###   #",
    "#.@$  #",
    "### $.#",
    "#.##$ #",
    "# # . ##",
    "#$ *$$.#",
    "#   .  #",
    "########"
  ]
];

function loadLevel(n) {
  var rows = LEVELS[n], s = { lvl: n, wall: [], goal: [], box: [], px: 0, py: 0, moves: 0, score: 0, history: [], status: "playing" };
  s.h = rows.length;
  s.w = 0;
  for (var y = 0; y < rows.length; y++) s.w = Math.max(s.w, rows[y].length);
  for (y = 0; y < s.h; y++) {
    s.wall.push([]); s.goal.push([]); s.box.push([]);
    for (var x = 0; x < s.w; x++) {
      var c = rows[y].charAt(x) || " ";
      s.wall[y].push(c === "#");
      s.goal[y].push(c === "." || c === "*" || c === "+");
      s.box[y].push(c === "$" || c === "*");
      if (c === "@" || c === "+") { s.px = x; s.py = y; }
    }
  }
  return s;
}

function gNew() { return loadLevel(0); }

function solved(s) {
  for (var y = 0; y < s.h; y++) for (var x = 0; x < s.w; x++) if (s.box[y][x] && !s.goal[y][x]) return false;
  return true;
}

function free(s, x, y) {
  return x >= 0 && y >= 0 && x < s.w && y < s.h && !s.wall[y][x] && !s.box[y][x];
}

function step(s, dir) {
  var d = DIRV[dir], nx = s.px + d.x, ny = s.py + d.y;
  if (nx < 0 || ny < 0 || nx >= s.w || ny >= s.h || s.wall[ny][nx]) return;
  var pushed = false;
  if (s.box[ny][nx]) {
    if (!free(s, nx + d.x, ny + d.y)) return;
    s.box[ny][nx] = false;
    s.box[ny + d.y][nx + d.x] = true;
    pushed = true;
  }
  s.history.push({ px: s.px, py: s.py, dir: dir, pushed: pushed });
  s.px = nx; s.py = ny;
  s.moves++;
  if (solved(s)) s.status = "solved";
}

function undo(s) {
  var h = s.history.pop();
  if (!h) return;
  if (h.pushed) {
    var d = DIRV[h.dir];
    s.box[s.py + d.y][s.px + d.x] = false;
    s.box[s.py][s.px] = true;
  }
  s.px = h.px; s.py = h.py;
  s.moves--;
  s.status = "playing";
}

function nextLevel(s) {
  return s.lvl + 1 < LEVELS.length ? loadLevel(s.lvl + 1) : loadLevel(0);
}

function gInput(s, kind, a) {
  if (kind === "btn") {
    if (a === "undo") undo(s);
    if (a === "restart") return loadLevel(s.lvl);
    if (a === "skip") return nextLevel(s);
  }
  if (kind !== "dir") return null;
  if (s.status === "solved") return nextLevel(s);
  step(s, a);
  s.score = s.moves;
  return null;
}

function gTick() { return false; }

function gBest(s) { return (s.lvl + 1) + "/" + LEVELS.length; }

function gRows(s) {
  var rows = [mid("LEVEL " + (s.lvl + 1) + " OF " + LEVELS.length), ""];
  for (var y = 0; y < s.h; y++) {
    var line = "";
    for (var x = 0; x < s.w; x++) {
      if (x === s.px && y === s.py) line += "@@";
      else if (s.wall[y][x]) line += "##";
      else if (s.box[y][x]) line += s.goal[y][x] ? "{}" : "[]";
      else if (s.goal[y][x]) line += "<>";
      else line += "  ";
    }
    rows.push(mid(line));
  }
  if (s.status === "solved") banner(rows, "SOLVED!", rows.length);
  return rows;
}

function gStatus(s) {
  if (s.status === "solved") {
    return s.lvl + 1 < LEVELS.length ? "Solved in " + s.moves + " moves! Arrow for next level" : "You beat every level! Arrow to start over";
  }
  return "Push every [] onto a <>. U undoes, R restarts";
}
