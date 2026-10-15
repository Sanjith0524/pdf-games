var doc = this;
var state = newState(Math.random);
var best = 0;
var lastText = {};

function setField(name, text) {
  if (lastText[name] === text) return;
  doc.getField(name).value = text;
  lastText[name] = text;
}

function draw() {
  var rows = renderRows(state);
  for (var i = 0; i < rows.length; i++) setField("row" + i, rows[i]);
  setField("status", statusText(state));
  setField("score", String(state.score));
  setField("best", String(best));
}

function onArrow(dir) {
  if (state.status !== "playing") {
    state = startGame(Math.random);
  }
  turn(state, dir);
  draw();
}

function onKey(key) {
  var dir = keyToDir(key);
  if (dir) onArrow(dir);
}

function tick() {
  if (step(state, Math.random)) {
    if (state.score > best) best = state.score;
    draw();
  }
}

draw();

// Keep the returned timer in a variable: some viewers stop a timer whose
// object gets garbage collected.
var timer = app.setInterval("tick()", TICK_MS);
