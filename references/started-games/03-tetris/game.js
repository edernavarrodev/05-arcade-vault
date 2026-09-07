'use strict';

const COLS = 10;
const ROWS = 20;
const BLOCK = 30;

const COLORS = [
  null,
  '#4dd0e1', // I - cyan
  '#ffd54f', // O - yellow
  '#ba68c8', // T - purple
  '#81c784', // S - green
  '#e57373', // Z - red
  '#7986cb', // J - indigo
  '#ffb74d', // L - orange
];

const PIECES = [
  null,
  [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]], // I
  [[2,2],[2,2]],                               // O
  [[0,3,0],[3,3,3],[0,0,0]],                  // T
  [[0,4,4],[4,4,0],[0,0,0]],                  // S
  [[5,5,0],[0,5,5],[0,0,0]],                  // Z
  [[6,0,0],[6,6,6],[0,0,0]],                  // J
  [[0,0,7],[7,7,7],[0,0,0]],                  // L
];

const SKIN_COLORS = {
  retro: COLORS,
  neon: [null, '#00e5ff', '#ffea00', '#e040fb', '#00e676', '#ff1744', '#536dfe', '#ff9100'],
  pastel: [null, '#a8e6ef', '#fff3b0', '#dcb8e0', '#c3e8c5', '#f4b8b8', '#c1c8ee', '#ffd9b3'],
  pixel: COLORS,
};

const LINE_SCORES = [0, 100, 300, 500, 800];

const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d');
const nextCanvas = document.getElementById('next-canvas');
const nextCtx = nextCanvas.getContext('2d');
const scoreEl = document.getElementById('score');
const linesEl = document.getElementById('lines');
const levelEl = document.getElementById('level');
const overlay = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlay-title');
const overlayScore = document.getElementById('overlay-score');
const restartBtn = document.getElementById('restart-btn');
const themeToggleBtn = document.getElementById('theme-toggle');
const pauseMenu = document.getElementById('pause-menu');
const controlsPanel = document.getElementById('controls-panel');
const controlsToggleBtn = document.getElementById('controls-toggle-btn');
const resumeBtn = document.getElementById('resume-btn');
const pauseRestartBtn = document.getElementById('pause-restart-btn');
const startLevelSelect = document.getElementById('start-level-select');
const skinSelect = document.getElementById('skin-select');
const recordsListEl = document.getElementById('records-list');
const bestComboEl = document.getElementById('best-combo');
const bestLinesEl = document.getElementById('best-lines');
const resetRecordsBtn = document.getElementById('reset-records-btn');
const recordEntryEl = document.getElementById('record-entry');
const recordNameInput = document.getElementById('record-name');
const saveRecordBtn = document.getElementById('save-record-btn');

const THEME_KEY = 'tetris-theme';
const SKIN_KEY = 'tetris-skin';
const RECORDS_KEY = 'tetris-records';
const MAX_RECORDS = 5;

let board, current, next, score, lines, level, paused, gameOver, lastTime, dropAccum, dropInterval, animId, controlsOpen, combo, maxCombo;
let theme, gridColor, skin;
let startLevel = 1; // no se resetea en init(): elegido en el menú de pausa, persiste entre reinicios

function createBoard() {
  return Array.from({ length: ROWS }, () => new Array(COLS).fill(0));
}

function randomPiece() {
  const type = Math.floor(Math.random() * 7) + 1;
  const shape = PIECES[type].map(row => [...row]);
  return { type, shape, x: Math.floor(COLS / 2) - Math.floor(shape[0].length / 2), y: 0 };
}

function collide(shape, ox, oy) {
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (!shape[r][c]) continue;
      const nx = ox + c;
      const ny = oy + r;
      if (nx < 0 || nx >= COLS || ny >= ROWS) return true;
      if (ny >= 0 && board[ny][nx]) return true;
    }
  }
  return false;
}

function rotateCW(shape) {
  const rows = shape.length, cols = shape[0].length;
  const result = Array.from({ length: cols }, () => new Array(rows).fill(0));
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++)
      result[c][rows - 1 - r] = shape[r][c];
  return result;
}

function tryRotate() {
  const rotated = rotateCW(current.shape);
  const kicks = [0, -1, 1, -2, 2];
  for (const kick of kicks) {
    if (!collide(rotated, current.x + kick, current.y)) {
      current.shape = rotated;
      current.x += kick;
      return;
    }
  }
}

function merge() {
  for (let r = 0; r < current.shape.length; r++)
    for (let c = 0; c < current.shape[r].length; c++)
      if (current.shape[r][c])
        board[current.y + r][current.x + c] = current.shape[r][c];
}

function clearLines() {
  let cleared = 0;
  for (let r = ROWS - 1; r >= 0; r--) {
    if (board[r].every(v => v !== 0)) {
      board.splice(r, 1);
      board.unshift(new Array(COLS).fill(0));
      cleared++;
      r++;
    }
  }
  if (cleared) {
    lines += cleared;
    score += (LINE_SCORES[cleared] || 0) * level;
    level = Math.floor(lines / 10) + 1;
    dropInterval = Math.max(100, 1000 - (level - 1) * 90);
    updateHUD();
  }
  return cleared;
}

function ghostY() {
  let gy = current.y;
  while (!collide(current.shape, current.x, gy + 1)) gy++;
  return gy;
}

function hardDrop() {
  const gy = ghostY();
  score += (gy - current.y) * 2;
  current.y = gy;
  lockPiece();
}

function softDrop() {
  if (!collide(current.shape, current.x, current.y + 1)) {
    current.y++;
    score += 1;
    updateHUD();
  } else {
    lockPiece();
  }
}

function lockPiece() {
  merge();
  const cleared = clearLines();
  if (cleared > 0) {
    combo++;
    maxCombo = Math.max(maxCombo, combo);
  } else {
    combo = 0;
  }
  spawn();
}

function spawn() {
  current = next;
  next = randomPiece();
  if (collide(current.shape, current.x, current.y)) {
    endGame();
  }
  drawNext();
}

function updateHUD() {
  scoreEl.textContent = score.toLocaleString();
  linesEl.textContent = lines;
  levelEl.textContent = level;
}

function roundedRect(context, x, y, w, h, r) {
  context.beginPath();
  context.moveTo(x + r, y);
  context.arcTo(x + w, y, x + w, y + h, r);
  context.arcTo(x + w, y + h, x, y + h, r);
  context.arcTo(x, y + h, x, y, r);
  context.arcTo(x, y, x + w, y, r);
  context.closePath();
}

function drawBlockRetro(context, px, py, size, color) {
  context.fillStyle = color;
  context.fillRect(px + 1, py + 1, size - 2, size - 2);
  context.fillStyle = 'rgba(255,255,255,0.12)';
  context.fillRect(px + 1, py + 1, size - 2, 4);
}

function drawBlockNeon(context, px, py, size, color) {
  context.save();
  context.shadowColor = color;
  context.shadowBlur = size * 0.5;
  context.fillStyle = color;
  context.fillRect(px + 2, py + 2, size - 4, size - 4);
  context.restore();
  context.strokeStyle = 'rgba(255,255,255,0.6)';
  context.lineWidth = 1;
  context.strokeRect(px + 2, py + 2, size - 4, size - 4);
}

function drawBlockPastel(context, px, py, size, color) {
  roundedRect(context, px + 1.5, py + 1.5, size - 3, size - 3, size * 0.22);
  context.fillStyle = color;
  context.fill();
  context.strokeStyle = 'rgba(255,255,255,0.5)';
  context.lineWidth = 1;
  context.stroke();
}

function drawBlockPixel(context, px, py, size, color) {
  context.fillStyle = color;
  context.fillRect(px + 1, py + 1, size - 2, size - 2);
  const half = (size - 2) / 2;
  context.fillStyle = 'rgba(0,0,0,0.15)';
  context.fillRect(px + 1, py + 1, half, half);
  context.fillRect(px + 1 + half, py + 1 + half, half, half);
  context.fillStyle = 'rgba(255,255,255,0.15)';
  context.fillRect(px + 1 + half, py + 1, half, half);
  context.fillRect(px + 1, py + 1 + half, half, half);
}

const SKIN_DRAWERS = {
  retro: drawBlockRetro,
  neon: drawBlockNeon,
  pastel: drawBlockPastel,
  pixel: drawBlockPixel,
};

function drawBlock(context, x, y, colorIndex, size, alpha) {
  if (!colorIndex) return;
  const color = SKIN_COLORS[skin][colorIndex];
  context.globalAlpha = alpha ?? 1;
  SKIN_DRAWERS[skin](context, x * size, y * size, size, color);
  context.globalAlpha = 1;
}

function drawGrid() {
  ctx.strokeStyle = gridColor;
  ctx.lineWidth = 0.5;
  for (let c = 1; c < COLS; c++) {
    ctx.beginPath();
    ctx.moveTo(c * BLOCK, 0);
    ctx.lineTo(c * BLOCK, ROWS * BLOCK);
    ctx.stroke();
  }
  for (let r = 1; r < ROWS; r++) {
    ctx.beginPath();
    ctx.moveTo(0, r * BLOCK);
    ctx.lineTo(COLS * BLOCK, r * BLOCK);
    ctx.stroke();
  }
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (skin === 'neon') {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  drawGrid();

  // board
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++)
      drawBlock(ctx, c, r, board[r][c], BLOCK);

  // ghost
  const gy = ghostY();
  for (let r = 0; r < current.shape.length; r++)
    for (let c = 0; c < current.shape[r].length; c++)
      if (current.shape[r][c])
        drawBlock(ctx, current.x + c, gy + r, current.shape[r][c], BLOCK, 0.2);

  // current piece
  for (let r = 0; r < current.shape.length; r++)
    for (let c = 0; c < current.shape[r].length; c++)
      drawBlock(ctx, current.x + c, current.y + r, current.shape[r][c], BLOCK);
}

function drawNext() {
  const NB = 30;
  nextCtx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
  const shape = next.shape;
  const offX = Math.floor((4 - shape[0].length) / 2);
  const offY = Math.floor((4 - shape.length) / 2);
  for (let r = 0; r < shape.length; r++)
    for (let c = 0; c < shape[r].length; c++)
      drawBlock(nextCtx, offX + c, offY + r, shape[r][c], NB);
}

function applyTheme(value) {
  theme = value;
  document.documentElement.dataset.theme = theme;
  gridColor = getComputedStyle(document.documentElement).getPropertyValue('--grid-line').trim();
  themeToggleBtn.textContent = theme === 'light' ? '☀️ Claro' : '🌙 Oscuro';
  themeToggleBtn.setAttribute('aria-pressed', theme === 'light');
}

function toggleTheme() {
  applyTheme(theme === 'light' ? 'dark' : 'light');
  localStorage.setItem(THEME_KEY, theme);
}

function applySkin(value) {
  skin = value;
  skinSelect.value = skin;
  draw();
  drawNext();
}

function changeSkin(value) {
  applySkin(value);
  localStorage.setItem(SKIN_KEY, skin);
}

function loadRecords() {
  try {
    const parsed = JSON.parse(localStorage.getItem(RECORDS_KEY));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveRecordsToStorage(records) {
  localStorage.setItem(RECORDS_KEY, JSON.stringify(records));
}

function qualifiesForRecords(s, records) {
  return records.length < MAX_RECORDS || s > records[records.length - 1].score;
}

function addRecord(name, s, l, c) {
  const records = loadRecords();
  records.push({ name, score: s, lines: l, combo: c });
  records.sort((a, b) => b.score - a.score);
  records.length = Math.min(records.length, MAX_RECORDS);
  saveRecordsToStorage(records);
  return records;
}

function renderRecords(highlightIndex) {
  const records = loadRecords();
  recordsListEl.innerHTML = '';
  if (!records.length) {
    const li = document.createElement('li');
    li.className = 'empty';
    li.textContent = 'Sin records aún';
    recordsListEl.appendChild(li);
  } else {
    records.forEach((r, i) => {
      const li = document.createElement('li');
      li.textContent = `${r.name} — ${r.score.toLocaleString()} pts (L${r.lines} / C${r.combo})`;
      if (i === highlightIndex) li.classList.add('highlight');
      recordsListEl.appendChild(li);
    });
  }
  bestComboEl.textContent = records.reduce((m, r) => Math.max(m, r.combo || 0), 0);
  bestLinesEl.textContent = records.reduce((m, r) => Math.max(m, r.lines || 0), 0);
}

function handleSaveRecord() {
  const name = recordNameInput.value.trim() || 'Jugador';
  const records = addRecord(name, score, lines, maxCombo);
  const idx = records.findIndex(r => r.name === name && r.score === score && r.lines === lines && r.combo === maxCombo);
  renderRecords(idx);
  recordEntryEl.classList.add('hidden');
}

function endGame() {
  gameOver = true;
  cancelAnimationFrame(animId);
  pauseMenu.classList.add('hidden');
  restartBtn.classList.remove('hidden-btn');
  overlayTitle.textContent = 'GAME OVER';
  overlayScore.textContent = `Puntuación: ${score.toLocaleString()}`;
  if (qualifiesForRecords(score, loadRecords())) {
    recordEntryEl.classList.remove('hidden');
    recordNameInput.value = '';
  } else {
    recordEntryEl.classList.add('hidden');
  }
  renderRecords();
  overlay.classList.remove('hidden');
}

function toggleControls() {
  controlsOpen = !controlsOpen;
  controlsPanel.classList.toggle('hidden', !controlsOpen);
}

function closeControls() {
  controlsOpen = false;
  controlsPanel.classList.add('hidden');
}

function togglePause() {
  if (gameOver) return;
  paused = !paused;
  if (!paused) {
    closeControls();
    lastTime = performance.now();
    loop(lastTime);
  } else {
    cancelAnimationFrame(animId);
    overlayTitle.textContent = 'PAUSA';
    overlayScore.textContent = '';
    restartBtn.classList.add('hidden-btn');
    pauseMenu.classList.remove('hidden');
    overlay.classList.remove('hidden');
  }
}

function loop(ts) {
  const dt = ts - lastTime;
  lastTime = ts;
  dropAccum += dt;
  if (dropAccum >= dropInterval) {
    dropAccum = 0;
    if (!collide(current.shape, current.x, current.y + 1)) {
      current.y++;
    } else {
      lockPiece();
    }
  }
  draw();
  animId = requestAnimationFrame(loop);
}

function init() {
  board = createBoard();
  score = 0;
  lines = (startLevel - 1) * 10;
  level = startLevel;
  paused = false;
  gameOver = false;
  controlsOpen = false;
  combo = 0;
  maxCombo = 0;
  dropInterval = Math.max(100, 1000 - (level - 1) * 90);
  dropAccum = 0;
  lastTime = performance.now();
  next = randomPiece();
  spawn();
  updateHUD();
  overlay.classList.add('hidden');
  pauseMenu.classList.add('hidden');
  controlsPanel.classList.add('hidden');
  restartBtn.classList.remove('hidden-btn');
  recordEntryEl.classList.add('hidden');
  cancelAnimationFrame(animId);
  animId = requestAnimationFrame(loop);
}

document.addEventListener('keydown', e => {
  if (e.code === 'KeyP' || e.code === 'Escape') {
    if (e.code === 'Escape' && paused && controlsOpen) { closeControls(); return; }
    togglePause();
    return;
  }
  if (paused || gameOver) return;
  switch (e.code) {
    case 'ArrowLeft':
      if (!collide(current.shape, current.x - 1, current.y)) current.x--;
      break;
    case 'ArrowRight':
      if (!collide(current.shape, current.x + 1, current.y)) current.x++;
      break;
    case 'ArrowDown':
      softDrop();
      break;
    case 'ArrowUp':
    case 'KeyX':
      tryRotate();
      break;
    case 'Space':
      e.preventDefault();
      hardDrop();
      break;
  }
  updateHUD();
});

restartBtn.addEventListener('click', init);
themeToggleBtn.addEventListener('click', toggleTheme);
resumeBtn.addEventListener('click', togglePause);
pauseRestartBtn.addEventListener('click', init);
controlsToggleBtn.addEventListener('click', toggleControls);
startLevelSelect.addEventListener('change', () => { startLevel = Number(startLevelSelect.value); });
startLevelSelect.addEventListener('keydown', e => e.stopPropagation());
skinSelect.addEventListener('change', e => changeSkin(e.target.value));
saveRecordBtn.addEventListener('click', handleSaveRecord);
recordNameInput.addEventListener('keydown', e => {
  e.stopPropagation();
  if (e.code === 'Enter') handleSaveRecord();
});
resetRecordsBtn.addEventListener('click', () => {
  if (confirm('¿Borrar todos los records?')) {
    localStorage.removeItem(RECORDS_KEY);
    renderRecords();
  }
});

applyTheme(localStorage.getItem(THEME_KEY) === 'light' ? 'light' : 'dark');
startLevelSelect.value = String(startLevel);
skin = SKIN_COLORS[localStorage.getItem(SKIN_KEY)] ? localStorage.getItem(SKIN_KEY) : 'retro';
skinSelect.value = skin;
renderRecords();
init();
