function repeat(text, count) {
  return new Array(count + 1).join(text);
}

function renderRows(state) {
  var grid = [];
  for (var y = 0; y < GRID_H; y++) {
    var row = [];
    for (var x = 0; x < GRID_W; x++) row.push(CELL_EMPTY);
    grid.push(row);
  }

  if (state.food) grid[state.food.y][state.food.x] = CELL_FOOD;

  for (var i = state.snake.length - 1; i >= 0; i--) {
    var part = state.snake[i];
    var cell = CELL_BODY;
    if (i === 0) cell = state.status === "dead" ? CELL_DEAD : CELL_HEAD;
    grid[part.y][part.x] = cell;
  }

  var wall = repeat(CELL_WALL, GRID_W + 2);
  var rows = [wall];
  for (var r = 0; r < GRID_H; r++) {
    rows.push(CELL_WALL + grid[r].join("") + CELL_WALL);
  }
  rows.push(wall);

  var banner = bannerText(state);
  if (banner) rows = withBanner(rows, banner);
  return rows;
}

function bannerText(state) {
  if (state.status === "ready") return "READY?";
  if (state.status === "dead") return "GAME OVER";
  if (state.status === "won") return "YOU WIN!";
  return null;
}

// Writes the text, padded with a space each side, into the middle of the
// middle row so it shows up on the game screen.
function withBanner(rows, text) {
  var label = " " + text + " ";
  var mid = Math.floor(rows.length / 2);
  var row = rows[mid];
  var start = Math.floor((row.length - label.length) / 2);
  rows[mid] = row.slice(0, start) + label + row.slice(start + label.length);
  return rows;
}

function statusText(state) {
  if (state.status === "ready") return "Press an arrow or W A S D to start";
  if (state.status === "dead") return "You bit yourself! Press an arrow to retry";
  if (state.status === "won") return "You filled the whole board!";
  return "Eat the <> and don't bite your tail";
}
