var G_RAW_KEYS = true;
var G_KEYS = { " ": "enter", "-": "del" };

var ANSWERS = ("APPLE BEACH BRAIN BREAD BRUSH CANDY CHAIR CHALK CHEST CLOCK " +
  "CLOUD CRANE CROWN DANCE DREAM DRINK EAGLE EARTH FEAST FIELD FLAME FLOUR " +
  "FROST FRUIT GHOST GIANT GLASS GRAPE GRASS HEART HONEY HORSE HOUSE JUICE " +
  "KNIFE LEMON LIGHT MAGIC MANGO MONEY MOUSE MUSIC NIGHT OCEAN OLIVE PAINT " +
  "PEACH PEARL PIANO PIZZA PLANT PLATE POINT QUEEN QUIET RADIO RIVER ROBOT " +
  "SALAD SCALE SHARK SHEEP SHELL SHIRT SHOES SKIRT SLEEP SMILE SNAKE SPACE " +
  "SPOON STAGE STONE STORM SUGAR SWEET TABLE TIGER TOAST TOOTH TORCH TOWER " +
  "TRAIN TRUCK UNCLE VOICE WATCH WATER WHALE WHEEL WORLD YOUTH ZEBRA BLAZE " +
  "BRAVE CABIN CHARM CRISP DWARF FABLE FLOCK GLOBE GROVE HAVEN IVORY JOLLY " +
  "KNACK LUNAR MAPLE NOBLE ORBIT PRISM QUILT RAVEN SCOUT SOLAR THYME VIVID " +
  "WALTZ YACHT ACORN BISON CORAL DELTA EMBER FROND GECKO HIPPO IGLOO JEWEL " +
  "KOALA LLAMA MOOSE NINJA OTTER PANDA QUAIL RHINO SQUID TULIP VIPER").split(" ");
var TRIES = 6;
var LEN = 5;
var KEY_ROWS = ["QWERTYUIOP", "ASDFGHJKL", "<ZXCVBNM>"];

function gNew(prev) {
  return {
    answer: ANSWERS[rnd(ANSWERS.length)], guesses: [], cur: "", status: "playing", note: "",
    known: {}, score: prev ? prev.score : 0, top: prev ? prev.top : 0
  };
}

// For each letter: 2 = right spot, 1 = in the word elsewhere, 0 = not in it.
function scoreGuess(answer, guess) {
  var marks = [], left = {}, i;
  for (i = 0; i < LEN; i++) {
    if (guess.charAt(i) === answer.charAt(i)) marks.push(2);
    else { marks.push(0); left[answer.charAt(i)] = (left[answer.charAt(i)] || 0) + 1; }
  }
  for (i = 0; i < LEN; i++) {
    var c = guess.charAt(i);
    if (marks[i] === 0 && left[c]) { marks[i] = 1; left[c]--; }
  }
  return marks;
}

function submit(s) {
  if (s.cur.length < LEN) { s.note = "Need 5 letters"; return; }
  var marks = scoreGuess(s.answer, s.cur);
  s.guesses.push({ word: s.cur, marks: marks });
  for (var i = 0; i < LEN; i++) {
    var c = s.cur.charAt(i);
    if (s.known[c] === undefined || marks[i] > s.known[c]) s.known[c] = marks[i];
  }
  if (s.cur === s.answer) { s.status = "won"; s.score++; s.top = Math.max(s.top, s.score); }
  else if (s.guesses.length === TRIES) { s.status = "lost"; s.score = 0; }
  s.cur = "";
}

function press(s, key) {
  if (s.status !== "playing") return gNew(s);
  s.note = "";
  if (key === "<") s.cur = s.cur.slice(0, -1);
  else if (key === ">") submit(s);
  else if (s.cur.length < LEN) s.cur += key;
  return null;
}

function gInput(s, kind, a, b, group) {
  if (kind === "btn" && a === "new") {
    if (s.status === "playing") s.score = 0;
    return gNew(s);
  }
  if (kind === "btn" && a === "enter") return press(s, ">");
  if (kind === "btn" && a === "del") return press(s, "<");
  if (kind === "key") {
    var k = a.toUpperCase();
    if (k.length === 1 && k >= "A" && k <= "Z") return press(s, k);
  }
  if (kind === "cell") {
    var row = KEY_ROWS[Number(group.charAt(1)) - 1];
    return press(s, row.charAt(a));
  }
  return null;
}

function gTick() { return false; }
function gBest(s) { return s.top; }

function tile(c, mark) {
  if (mark === 2) return "[" + c + "]";
  if (mark === 1) return "(" + c + ")";
  return " " + c + " ";
}

function gRows(s) {
  var rows = [], i, j;
  for (i = 0; i < TRIES; i++) {
    var parts = [];
    for (j = 0; j < LEN; j++) {
      if (i < s.guesses.length) {
        var g = s.guesses[i], c = g.word.charAt(j);
        parts.push(tile(g.marks[j] ? c : c.toLowerCase(), g.marks[j]));
      } else if (i === s.guesses.length && s.status === "playing") {
        parts.push(j < s.cur.length ? " " + s.cur.charAt(j) + " " : " _ ");
      } else {
        parts.push(" . ");
      }
    }
    rows.push(mid(parts.join(" ")));
    rows.push("");
  }
  for (i = 0; i < KEY_ROWS.length; i++) {
    var line = "";
    for (j = 0; j < KEY_ROWS[i].length; j++) {
      var k = KEY_ROWS[i].charAt(j);
      if (k === "<") line += "DEL";
      else if (k === ">") line += "ENT";
      else if (s.known[k] === 0) line += " . ";
      else line += tile(k, s.known[k]);
    }
    rows.push(mid(line));
  }
  if (s.status === "won") banner(rows, "GOT IT!", 11);
  if (s.status === "lost") banner(rows, "IT WAS " + s.answer, 11);
  return rows;
}

function gStatus(s) {
  if (s.status === "won") return "Solved in " + s.guesses.length + "! Click a key to play again";
  if (s.status === "lost") return "The word was " + s.answer + ". Click a key to play again";
  if (s.note) return s.note;
  return "[A] right spot  (A) wrong spot  a not in the word";
}
