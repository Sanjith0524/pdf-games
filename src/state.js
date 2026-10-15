function newState(random) {
  var cx = Math.floor(GRID_W / 2);
  var cy = Math.floor(GRID_H / 2);
  var snake = [];
  for (var i = 0; i < START_LENGTH; i++) {
    snake.push({ x: cx - i, y: cy });
  }
  var state = {
    snake: snake,
    dir: "right",
    nextDir: "right",
    food: null,
    score: 0,
    status: "ready"
  };
  placeFood(state, random);
  return state;
}

function startGame(random) {
  var state = newState(random);
  state.status = "playing";
  return state;
}
