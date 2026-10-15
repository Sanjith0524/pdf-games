// Helpers shared by every game. Plain ES5 on purpose: Acrobat's JavaScript
// engine is old, so no let/const, arrow functions or newer string methods.

var G_KEYS = {};        // key -> button name, e.g. { " ": "drop" }
var G_RAW_KEYS = false; // true = W A S D are letters, not arrows
var G_TICK = 0;         // ms between tick() calls, 0 = no timer

var DIRV = {
  up:    { x: 0,  y: -1 },
  down:  { x: 0,  y: 1 },
  left:  { x: -1, y: 0 },
  right: { x: 1,  y: 0 }
};
var DIR_NAMES = ["up", "down", "left", "right"];
var OPP = { up: "down", down: "up", left: "right", right: "left" };

function rnd(n) {
  return Math.floor(Math.random() * n);
}

function rep(text, n) {
  var s = "";
  for (var i = 0; i < n; i++) s += text;
  return s;
}

function padR(text, n) {
  text = String(text);
  return text.length >= n ? text.slice(0, n) : text + rep(" ", n - text.length);
}

function padL(text, n) {
  text = String(text);
  return text.length >= n ? text.slice(0, n) : rep(" ", n - text.length) + text;
}

// Centers text in a row n characters wide.
function mid(text, n) {
  text = String(text);
  if (n === undefined) n = G_COLS;
  var left = Math.max(0, Math.floor((n - text.length) / 2));
  return padR(rep(" ", left) + text, n);
}

function overlay(row, text, at) {
  return row.slice(0, at) + text + row.slice(at + text.length);
}

// Writes " TEXT " over the middle of a row (the middle row by default).
function banner(rows, text, at) {
  var label = " " + text + " ";
  if (at === undefined) at = Math.floor(rows.length / 2);
  var row = padR(rows[at] || "", G_COLS);
  rows[at] = overlay(row, label, Math.max(0, Math.floor((row.length - label.length) / 2)));
  return rows;
}

function grid(w, h, value) {
  var g = [];
  for (var y = 0; y < h; y++) {
    var row = [];
    for (var x = 0; x < w; x++) row.push(value);
    g.push(row);
  }
  return g;
}

function copyGrid(g) {
  var out = [];
  for (var y = 0; y < g.length; y++) out.push(g[y].slice());
  return out;
}

function shuffle(list) {
  for (var i = list.length - 1; i > 0; i--) {
    var j = rnd(i + 1);
    var t = list[i]; list[i] = list[j]; list[j] = t;
  }
  return list;
}

// Lower is better (moves, seconds): only counts finished games.
function lowerBest(best, value) {
  return best === null || value < best ? value : best;
}
