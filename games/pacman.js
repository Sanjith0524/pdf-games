var G_TICK = 150;

// # wall   (space) outside the maze   . pellet   o power pellet
// = empty path   - ghost door   G ghost start   P player start
var MAZE = [
  "###################",
  "#........#........#",
  "#o##.###.#.###.##o#",
  "#.................#",
  "#.##.#.#####.#.##.#",
  "#....#...#...#....#",
  "####.###=#=###.####",
  "   #.#=======#.#   ",
  "####.#=##-##=#.####",
  "=====.=#GGG#=.=====",
  "####.#=#####=#.####",
  "   #.#=======#.#   ",
  "####.#=#####=#.####",
  "#........#........#",
  "#.##.###.#.###.##.#",
  "#o.#.....P.....#.o#",
  "##.#.#.#####.#.#.##",
  "#....#...#...#....#",
  "#.######.#.######.#",
  "#.................#",
  "###################"
];
var MW = MAZE[0].length;
var MH = MAZE.length;
var DOOR = { x: 9, y: 7 };   // the square just outside the ghost house

function loadMaze(s) {
  s.maze = [];
  s.pellets = 0;
  for (var y = 0; y < MH; y++) {
    var row = [];
    for (var x = 0; x < MW; x++) {
      var c = MAZE[y].charAt(x);
      if (c === "P") { s.start = { x: x, y: y }; c = "="; }
      if (c === "G") c = "=";
      if (c === "." || c === "o") s.pellets++;
      row.push(c);
    }
    s.maze.push(row);
  }
}

function placeActors(s) {
  s.p = { x: s.start.x, y: s.start.y, dir: "left", next: "left" };
  s.ghosts = [];
  for (var i = 0; i < 3; i++) {
    s.ghosts.push({ x: 8 + i, y: 9, dir: "up", wait: i * 12, fr: false, id: i });
  }
  s.fright = 0;
}

function gNew() {
  var s = { score: 0, lives: 3, level: 1, status: "ready", t: 0, pause: 0 };
  loadMaze(s);
  placeActors(s);
  return s;
}

function wrapX(x) { return (x + MW) % MW; }

function cellAt(s, x, y) {
  if (y < 0 || y >= MH) return "#";
  return s.maze[y][wrapX(x)];
}

function playerCan(s, x, y) {
  var c = cellAt(s, x, y);
  return c !== "#" && c !== " " && c !== "-";
}

function ghostCan(s, x, y, dir) {
  var c = cellAt(s, x, y);
  if (c === "-") return dir === "up";
  return c !== "#" && c !== " ";
}

function inHouse(g) {
  return (g.y === 9 && g.x >= 8 && g.x <= 10) || (g.y === 8 && g.x === 9);
}

function ghostTarget(s, g) {
  if (inHouse(g)) return DOOR;
  var p = s.p, d = DIRV[p.dir];
  if (g.id === 1) return { x: p.x + d.x * 4, y: p.y + d.y * 4 };
  if (g.id === 2 && Math.abs(g.x - p.x) + Math.abs(g.y - p.y) < 7) return { x: 0, y: MH - 1 };
  return { x: p.x, y: p.y };
}

function moveGhost(s, g) {
  if (g.wait > 0) { g.wait--; return; }
  var options = [];
  for (var i = 0; i < 4; i++) {
    var dir = DIR_NAMES[i], d = DIRV[dir];
    if (dir !== OPP[g.dir] && ghostCan(s, g.x + d.x, g.y + d.y, dir)) options.push(dir);
  }
  if (!options.length) options.push(OPP[g.dir]);
  var pick = options[0];
  if (g.fr) {
    pick = options[rnd(options.length)];
  } else {
    var target = ghostTarget(s, g), bestDist = Infinity;
    for (i = 0; i < options.length; i++) {
      var o = DIRV[options[i]], dx = g.x + o.x - target.x, dy = g.y + o.y - target.y;
      if (dx * dx + dy * dy < bestDist) { bestDist = dx * dx + dy * dy; pick = options[i]; }
    }
  }
  g.dir = pick;
  g.x = wrapX(g.x + DIRV[pick].x);
  g.y += DIRV[pick].y;
}

function collide(s) {
  for (var i = 0; i < s.ghosts.length; i++) {
    var g = s.ghosts[i];
    if (g.x !== s.p.x || g.y !== s.p.y) continue;
    if (g.fr) {
      s.eaten = (s.eaten || 0) + 1;
      s.score += 100 * Math.pow(2, s.eaten);
      g.x = 9; g.y = 9; g.dir = "up"; g.fr = false; g.wait = 10;
    } else {
      s.lives--;
      s.status = s.lives > 0 ? "dying" : "over";
      s.pause = 12;
      return;
    }
  }
}

function movePlayer(s) {
  var p = s.p, n = DIRV[p.next];
  if (playerCan(s, p.x + n.x, p.y + n.y)) p.dir = p.next;
  var d = DIRV[p.dir];
  if (!playerCan(s, p.x + d.x, p.y + d.y)) return;
  p.x = wrapX(p.x + d.x);
  p.y += d.y;
  var c = s.maze[p.y][p.x];
  if (c === "." || c === "o") {
    s.maze[p.y][p.x] = "=";
    s.pellets--;
    s.score += c === "." ? 10 : 50;
  }
  if (c === "o") {
    s.fright = Math.max(15, 45 - s.level * 5);
    s.eaten = 0;
    for (var i = 0; i < s.ghosts.length; i++) {
      var g = s.ghosts[i];
      if (!inHouse(g)) { g.fr = true; g.dir = OPP[g.dir]; }
    }
  }
}

function gTick(s) {
  if (s.status === "dying" || s.status === "cleared") {
    if (--s.pause > 0) return false;
    if (s.status === "cleared") { s.level++; loadMaze(s); }
    placeActors(s);
    s.status = "playing";
    return true;
  }
  if (s.status !== "playing") return false;
  s.t++;
  movePlayer(s);
  collide(s);
  if (s.status !== "playing") return true;
  if (s.pellets === 0) { s.status = "cleared"; s.pause = 12; return true; }
  if (s.fright > 0 && --s.fright === 0) {
    for (var i = 0; i < s.ghosts.length; i++) s.ghosts[i].fr = false;
  }
  // Ghosts are a bit slower than you, and much slower when frightened.
  var skip = Math.max(3, 6 - s.level);
  for (i = 0; i < s.ghosts.length; i++) {
    var g = s.ghosts[i];
    if (g.fr ? s.t % 2 === 0 : s.t % skip === 0) continue;
    moveGhost(s, g);
  }
  collide(s);
  return true;
}

function gInput(s, kind, a) {
  if (kind !== "dir") return null;
  if (s.status === "over") return gNew();
  if (s.status === "ready") s.status = "playing";
  s.p.next = a;
  if (a === OPP[s.p.dir]) s.p.dir = a;
  return null;
}

var LOOK = { "#": "::", " ": "  ", ".": " .", "o": "()", "=": "  ", "-": "--" };

function gRows(s) {
  var rows = [];
  for (var y = 0; y < MH; y++) {
    var cells = [];
    for (var x = 0; x < MW; x++) cells.push(LOOK[s.maze[y][x]]);
    for (var i = 0; i < s.ghosts.length; i++) {
      var g = s.ghosts[i];
      if (g.y === y) cells[g.x] = g.fr ? (s.fright < 8 && s.t % 2 ? "MM" : "ww") : "MM";
    }
    if (s.p.y === y && s.status !== "over") cells[s.p.x] = s.status === "dying" ? "XX" : s.t % 2 ? "@@" : "<@";
    rows.push(cells.join(""));
  }
  if (s.status === "ready") banner(rows, "READY!", 11);
  if (s.status === "over") banner(rows, "GAME OVER", 11);
  if (s.status === "cleared") banner(rows, "LEVEL CLEAR!", 11);
  return rows;
}

function gStatus(s) {
  if (s.status === "ready") return "Eat every dot. () makes the MM ghosts edible!";
  if (s.status === "over") return "Caught! Press an arrow to play again";
  return "Lives: " + rep("@ ", s.lives) + "  Level " + s.level;
}
