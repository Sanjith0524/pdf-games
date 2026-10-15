var fs = require("fs");
var vm = require("vm");

var files = ["config.js", "state.js", "update.js", "render.js"];
var code = files.map(function (f) {
  return fs.readFileSync(__dirname + "/../src/" + f, "utf8");
}).join("\n");

vm.runInThisContext(code);

// Predictable "random" numbers so every run gives the same result.
function seeded(seed) {
  return function () {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
}

function check(label, ok) {
  console.log((ok ? "PASS " : "FAIL ") + label);
  if (!ok) process.exitCode = 1;
}

var rand = seeded(42);

// 1. Starting position
var s = startGame(rand);
console.log(renderRows(s).join("\n"));
console.log(statusText(s));
check("starts with 3 parts, heading right", s.snake.length === 3 && s.dir === "right");

// 2. Moving
step(s, rand);
check("one step moves the head right", s.snake[0].x === 11 && s.snake[0].y === 7 && s.snake.length === 3);

// 3. Can't reverse into yourself
turn(s, "left");
step(s, rand);
check("pressing left while going right is ignored", s.dir === "right" && s.status === "playing");

// 4. Two quick turns can't sneak a reversal
turn(s, "up");
turn(s, "left");
step(s, rand);
check("up then left in one tick: left is ignored, snake goes up safely", s.dir === "up" && s.status === "playing");

// 5. Eating grows the snake and moves the food
s = startGame(rand);
s.food = { x: 11, y: 7 };
step(s, rand);
check("eating grows to 4 and scores 1", s.snake.length === 4 && s.score === 1);
check("new food is not on the snake", s.food && !hits(s.snake, s.food.x, s.food.y));

// 6. Wrapping around the edges
s = startGame(rand);
s.food = { x: 0, y: 0 };
for (var i = 0; i < 10; i++) step(s, rand);
check("running off the right edge comes back on the left", s.status === "playing" && s.snake[0].x === 0 && s.snake[0].y === 7);
turn(s, "up");
for (var i = 0; i < 8; i++) step(s, rand);
check("running off the top comes back at the bottom", s.status === "playing" && s.snake[0].x === 0 && s.snake[0].y === GRID_H - 1);
turn(s, "left");
step(s, rand);
check("running off the left edge comes back on the right", s.status === "playing" && s.snake[0].x === GRID_W - 1);

// 7. Biting yourself
s = startGame(rand);
s.snake = [{x:5,y:5},{x:4,y:5},{x:4,y:6},{x:5,y:6},{x:6,y:6},{x:6,y:5}];
s.dir = s.nextDir = "up";
s.food = { x: 0, y: 0 };
turn(s, "left"); step(s, rand);
turn(s, "down"); step(s, rand);
check("turning into your own body kills you", s.status === "dead");

// 8. Moving into the spot your tail is leaving is allowed
s = startGame(rand);
s.snake = [{x:5,y:5},{x:5,y:6},{x:6,y:6},{x:6,y:5}];
s.dir = s.nextDir = "right";
s.food = { x: 0, y: 0 };
step(s, rand);
check("chasing your own tail is safe", s.status === "playing");

// 9. Keyboard mapping
check("W A S D map to up left down right (any case)",
  keyToDir("w") === "up" && keyToDir("A") === "left" && keyToDir("s") === "down" && keyToDir("D") === "right");
check("other keys are ignored", keyToDir("x") === null && keyToDir(" ") === null);

// 10. Banners on the game screen
s = newState(rand);
var rows = renderRows(s);
check("READY? shows in the middle row before starting", rows[8].indexOf(" READY? ") > 0 && rows[8].length === rows[0].length);
s = startGame(rand);
check("no banner while playing", renderRows(s).join("").indexOf("READY") === -1);
s.status = "dead";
check("GAME OVER shows after dying", renderRows(s)[8].indexOf(" GAME OVER ") > 0);
console.log(renderRows(s).join("\n"));
