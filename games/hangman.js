var G_RAW_KEYS = true;
var G_KEYS = { " ": "new" };

var WORDS = ("ROCKET GUITAR JUNGLE PLANET WIZARD CASTLE DRAGON PUZZLE GALAXY ROBOT " +
  "PYTHON KEYBOARD MONITOR SANDWICH PENGUIN VOLCANO DIAMOND COMPASS LANTERN TORNADO " +
  "BALLOON CAMERA PIRATE JACKET KITCHEN LADDER MARBLE NAPKIN ORANGE PARROT " +
  "QUARTZ RABBIT SPIDER TICKET UMBRELLA VIOLIN WALRUS YOGURT ZIPPER ANCHOR " +
  "BRIDGE CACTUS DOLPHIN ENGINE FOSSIL GLACIER HAMMER IGLOO JIGSAW KOALA " +
  "LEMON MAGNET NOODLE OCTOPUS PEPPER QUIVER RIDDLE SAILOR TEACUP UNICORN " +
  "VELVET WAFFLE OXYGEN BUTTER CANYON DESERT FALCON GOBLIN HARBOR ISLAND " +
  "JOURNAL KETTLE LIZARD MEADOW NEBULA OYSTER PICKLE RAINBOW SCOOTER THUNDER " +
  "TRUMPET VOYAGE WHISTLE BLANKET CRAYON DONKEY ECLIPSE FIDDLE GARDEN HELMET " +
  "INSECT JELLY KAYAK LAPTOP MITTEN NUTMEG ORBIT PILLOW QUILT ROOSTER " +
  "SPHINX TOFFEE TURTLE VACUUM WHALE BREEZE COOKIE DYNAMO ESCAPE FROZEN").split(" ");
var ALPHA = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
var MAX_WRONG = 6;

var GALLOWS = [
  ["  +---+  ", "  |   |  ", "      |  ", "      |  ", "      |  ", "      |  ", "========="],
  ["  +---+  ", "  |   |  ", "  O   |  ", "      |  ", "      |  ", "      |  ", "========="],
  ["  +---+  ", "  |   |  ", "  O   |  ", "  |   |  ", "      |  ", "      |  ", "========="],
  ["  +---+  ", "  |   |  ", "  O   |  ", " /|   |  ", "      |  ", "      |  ", "========="],
  ["  +---+  ", "  |   |  ", "  O   |  ", " /|\\  |  ", "      |  ", "      |  ", "========="],
  ["  +---+  ", "  |   |  ", "  O   |  ", " /|\\  |  ", " /    |  ", "      |  ", "========="],
  ["  +---+  ", "  |   |  ", "  O   |  ", " /|\\  |  ", " / \\  |  ", "      |  ", "========="]
];

function gNew(prev) {
  return {
    word: WORDS[rnd(WORDS.length)], used: {}, wrong: 0, status: "playing",
    score: prev ? prev.score : 0, top: prev ? prev.top : 0
  };
}

function solved(s) {
  for (var i = 0; i < s.word.length; i++) if (!s.used[s.word.charAt(i)]) return false;
  return true;
}

function guess(s, letter) {
  if (s.status !== "playing") return gNew(s);
  if (s.used[letter]) return null;
  s.used[letter] = true;
  if (s.word.indexOf(letter) < 0) s.wrong++;
  if (solved(s)) { s.status = "won"; s.score++; s.top = Math.max(s.top, s.score); }
  else if (s.wrong >= MAX_WRONG) { s.status = "lost"; s.score = 0; }
  return null;
}

function gInput(s, kind, a, b) {
  if (kind === "btn" && a === "new") {
    if (s.status === "playing") s.score = 0;   // giving up ends the streak
    return gNew(s);
  }
  if (kind === "cell") return guess(s, ALPHA.charAt(b * 13 + a));
  if (kind === "key") {
    var letter = a.toUpperCase();
    if (ALPHA.indexOf(letter) >= 0 && letter.length === 1) return guess(s, letter);
  }
  return null;
}

function gTick() { return false; }
function gBest(s) { return s.top; }

function gRows(s) {
  var rows = [], i, art = GALLOWS[Math.min(s.wrong, MAX_WRONG)];
  for (i = 0; i < art.length; i++) rows.push(mid(art[i]));
  rows.push("");
  var shown = [];
  for (i = 0; i < s.word.length; i++) {
    var c = s.word.charAt(i);
    shown.push(s.used[c] || s.status === "lost" ? c : "_");
  }
  rows.push(mid(shown.join(" ")));
  rows.push("");
  for (var r = 0; r < 2; r++) {
    var line = "";
    for (i = 0; i < 13; i++) {
      var letter = ALPHA.charAt(r * 13 + i);
      line += s.used[letter] ? (s.word.indexOf(letter) >= 0 ? "[" + letter + "]" : " - ") : " " + letter + " ";
    }
    rows.push(line);
  }
  return rows;
}

function gStatus(s) {
  if (s.status === "won") return "You got it! Click a letter to play again";
  if (s.status === "lost") return "Hanged! The word was " + s.word + ". Click to retry";
  return "Click letters or type them. Misses left: " + (MAX_WRONG - s.wrong);
}
