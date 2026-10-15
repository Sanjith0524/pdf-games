var DIRS = {
  up:    { x: 0,  y: -1 },
  down:  { x: 0,  y: 1 },
  left:  { x: -1, y: 0 },
  right: { x: 1,  y: 0 }
};

var OPPOSITE = { up: "down", down: "up", left: "right", right: "left" };

var KEY_DIRS = { w: "up", a: "left", s: "down", d: "right" };

function keyToDir(key) {
  return KEY_DIRS[key.toLowerCase()] || null;
}

function hits(cells, x, y) {
  for (var i = 0; i < cells.length; i++) {
    if (cells[i].x === x && cells[i].y === y) return true;
  }
  return false;
}

function placeFood(state, random) {
  var free = [];
  for (var y = 0; y < GRID_H; y++) {
    for (var x = 0; x < GRID_W; x++) {
      if (!hits(state.snake, x, y)) free.push({ x: x, y: y });
    }
  }
  if (free.length === 0) {
    state.food = null;
    state.status = "won";
    return;
  }
  state.food = free[Math.floor(random() * free.length)];
}

function turn(state, dir) {
  // Compare against the direction the snake actually moved last tick, so two
  // quick presses (e.g. up then left while going right) can't reverse it.
  if (dir === OPPOSITE[state.dir]) return state;
  state.nextDir = dir;
  return state;
}

function step(state, random) {
  if (state.status !== "playing") return false;

  state.dir = state.nextDir;
  var head = state.snake[0];
  var d = DIRS[state.dir];
  // Going off one edge brings you back in on the opposite edge. Adding the
  // grid size before % keeps the result positive when moving left/up from 0.
  var nx = (head.x + d.x + GRID_W) % GRID_W;
  var ny = (head.y + d.y + GRID_H) % GRID_H;

  var eating = state.food !== null && nx === state.food.x && ny === state.food.y;
  // The tail moves out of the way this tick unless we're growing.
  var body = eating ? state.snake : state.snake.slice(0, -1);
  if (hits(body, nx, ny)) {
    state.status = "dead";
    return true;
  }

  state.snake.unshift({ x: nx, y: ny });
  if (eating) {
    state.score++;
    placeFood(state, random);
  } else {
    state.snake.pop();
  }
  return true;
}
