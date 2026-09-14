const COLS = 10;
const ROWS = 20;
const BLOCK = 30;
const REPEAT_MS = 120;

const COLORS = [
  null,
  "#4dd0e1", // I - cyan
  "#ffd54f", // O - yellow
  "#ba68c8", // T - purple
  "#81c784", // S - green
  "#e57373", // Z - red
  "#7986cb", // J - indigo
  "#ffb74d", // L - orange
] as const;

const PIECES: number[][][] = [
  [],
  [
    [0, 0, 0, 0],
    [1, 1, 1, 1],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ], // I
  [
    [2, 2],
    [2, 2],
  ], // O
  [
    [0, 3, 0],
    [3, 3, 3],
    [0, 0, 0],
  ], // T
  [
    [0, 4, 4],
    [4, 4, 0],
    [0, 0, 0],
  ], // S
  [
    [5, 5, 0],
    [0, 5, 5],
    [0, 0, 0],
  ], // Z
  [
    [6, 0, 0],
    [6, 6, 6],
    [0, 0, 0],
  ], // J
  [
    [0, 0, 7],
    [7, 7, 7],
    [0, 0, 0],
  ], // L
];

const LINE_SCORES = [0, 100, 300, 500, 800];
const START_LIVES = 1;

export type TetrisPhase = "playing" | "gameover";

export interface TetrisState {
  score: number;
  lines: number;
  level: number;
  lives: number;
  phase: TetrisPhase;
  paused: boolean;
}

export interface TetrisEngine {
  start(): void;
  stop(): void;
  setPaused(paused: boolean): void;
  restart(): void;
  moveLeft(down: boolean): void;
  moveRight(down: boolean): void;
  softDrop(down: boolean): void;
  rotate(): void;
  hardDrop(): void;
}

interface Piece {
  type: number;
  shape: number[][];
  x: number;
  y: number;
}

function createBoard(): number[][] {
  return Array.from({ length: ROWS }, () => new Array(COLS).fill(0));
}

function randomPiece(): Piece {
  const type = Math.floor(Math.random() * 7) + 1;
  const shape = PIECES[type].map((row) => [...row]);
  return { type, shape, x: Math.floor(COLS / 2) - Math.floor(shape[0].length / 2), y: 0 };
}

function collide(board: number[][], shape: number[][], ox: number, oy: number): boolean {
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

function rotateCW(shape: number[][]): number[][] {
  const rows = shape.length;
  const cols = shape[0].length;
  const result: number[][] = Array.from({ length: cols }, () => new Array(rows).fill(0));
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) result[c][rows - 1 - r] = shape[r][c];
  return result;
}

export function createTetrisEngine(
  canvas: HTMLCanvasElement,
  nextCanvas: HTMLCanvasElement,
  onStateChange: (state: TetrisState) => void,
): TetrisEngine {
  const ctx2d = canvas.getContext("2d");
  const nextCtx2d = nextCanvas.getContext("2d");
  if (!ctx2d || !nextCtx2d) throw new Error("No se pudo obtener el contexto 2D del canvas");
  const ctx: CanvasRenderingContext2D = ctx2d;
  const nextCtx: CanvasRenderingContext2D = nextCtx2d;

  canvas.width = COLS * BLOCK;
  canvas.height = ROWS * BLOCK;
  nextCanvas.width = 4 * BLOCK;
  nextCanvas.height = 4 * BLOCK;

  let board: number[][];
  let current: Piece;
  let next: Piece;
  let score: number;
  let lines: number;
  let level: number;
  let lives: number;
  let phase: TetrisPhase;
  let paused = false;
  let dropInterval: number;
  let dropAccum: number;
  let leftTimer = 0;
  let rightTimer = 0;
  let downTimer = 0;
  const keys: Record<"ArrowLeft" | "ArrowRight" | "ArrowDown", boolean> = {
    ArrowLeft: false,
    ArrowRight: false,
    ArrowDown: false,
  };

  let rafId: number | null = null;
  let lastTime: number | null = null;
  let lastEmitted: TetrisState | null = null;

  function tryMove(dx: number) {
    if (!collide(board, current.shape, current.x + dx, current.y)) current.x += dx;
  }

  function ghostY() {
    let gy = current.y;
    while (!collide(board, current.shape, current.x, gy + 1)) gy++;
    return gy;
  }

  function merge() {
    for (let r = 0; r < current.shape.length; r++)
      for (let c = 0; c < current.shape[r].length; c++)
        if (current.shape[r][c]) board[current.y + r][current.x + c] = current.shape[r][c];
  }

  function clearLines() {
    let cleared = 0;
    for (let r = ROWS - 1; r >= 0; r--) {
      if (board[r].every((v) => v !== 0)) {
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
    }
    return cleared;
  }

  function spawn() {
    current = next;
    next = randomPiece();
    if (collide(board, current.shape, current.x, current.y)) {
      lives = 0;
      phase = "gameover";
    }
  }

  function lockPiece() {
    merge();
    clearLines();
    spawn();
  }

  function doRotate() {
    const rotated = rotateCW(current.shape);
    const kicks = [0, -1, 1, -2, 2];
    for (const kick of kicks) {
      if (!collide(board, rotated, current.x + kick, current.y)) {
        current.shape = rotated;
        current.x += kick;
        return;
      }
    }
  }

  function doSoftDrop() {
    if (!collide(board, current.shape, current.x, current.y + 1)) {
      current.y++;
      score += 1;
    } else {
      lockPiece();
    }
  }

  function doHardDrop() {
    const gy = ghostY();
    score += (gy - current.y) * 2;
    current.y = gy;
    lockPiece();
  }

  function initGame() {
    board = createBoard();
    score = 0;
    lines = 0;
    level = 1;
    lives = START_LIVES;
    phase = "playing";
    dropInterval = Math.max(100, 1000 - (level - 1) * 90);
    dropAccum = 0;
    leftTimer = 0;
    rightTimer = 0;
    downTimer = 0;
    keys.ArrowLeft = false;
    keys.ArrowRight = false;
    keys.ArrowDown = false;
    next = randomPiece();
    spawn();
  }

  function snapshot(): TetrisState {
    return { score, lines, level, lives, phase, paused };
  }

  function statesEqual(a: TetrisState, b: TetrisState) {
    return (
      a.score === b.score &&
      a.lines === b.lines &&
      a.level === b.level &&
      a.lives === b.lives &&
      a.phase === b.phase &&
      a.paused === b.paused
    );
  }

  function emitStateIfChanged() {
    const snap = snapshot();
    if (!lastEmitted || !statesEqual(lastEmitted, snap)) {
      lastEmitted = snap;
      onStateChange(snap);
    }
  }

  function update(dt: number) {
    if (keys.ArrowLeft) {
      leftTimer += dt;
      if (leftTimer >= REPEAT_MS) {
        leftTimer -= REPEAT_MS;
        tryMove(-1);
      }
    } else {
      leftTimer = 0;
    }

    if (keys.ArrowRight) {
      rightTimer += dt;
      if (rightTimer >= REPEAT_MS) {
        rightTimer -= REPEAT_MS;
        tryMove(1);
      }
    } else {
      rightTimer = 0;
    }

    if (keys.ArrowDown) {
      downTimer += dt;
      if (downTimer >= REPEAT_MS) {
        downTimer -= REPEAT_MS;
        doSoftDrop();
      }
    } else {
      downTimer = 0;
    }

    dropAccum += dt;
    if (dropAccum >= dropInterval) {
      dropAccum = 0;
      if (!collide(board, current.shape, current.x, current.y + 1)) current.y++;
      else lockPiece();
    }
  }

  function drawBlock(context: CanvasRenderingContext2D, x: number, y: number, colorIndex: number, size: number, alpha = 1) {
    if (!colorIndex) return;
    const color = COLORS[colorIndex];
    if (!color) return;
    const px = x * size;
    const py = y * size;
    context.globalAlpha = alpha;
    context.fillStyle = color;
    context.fillRect(px + 1, py + 1, size - 2, size - 2);
    context.fillStyle = "rgba(255,255,255,0.12)";
    context.fillRect(px + 1, py + 1, size - 2, 4);
    context.globalAlpha = 1;
  }

  function drawGrid() {
    ctx.strokeStyle = "rgba(255,255,255,0.06)";
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
    ctx.fillStyle = "#0a0a0f";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    drawGrid();

    for (let r = 0; r < ROWS; r++)
      for (let c = 0; c < COLS; c++) drawBlock(ctx, c, r, board[r][c], BLOCK);

    const gy = ghostY();
    for (let r = 0; r < current.shape.length; r++)
      for (let c = 0; c < current.shape[r].length; c++)
        if (current.shape[r][c]) drawBlock(ctx, current.x + c, gy + r, current.shape[r][c], BLOCK, 0.2);

    for (let r = 0; r < current.shape.length; r++)
      for (let c = 0; c < current.shape[r].length; c++)
        drawBlock(ctx, current.x + c, current.y + r, current.shape[r][c], BLOCK);
  }

  function drawNext() {
    nextCtx.fillStyle = "#0a0a0f";
    nextCtx.fillRect(0, 0, nextCanvas.width, nextCanvas.height);
    const shape = next.shape;
    const offX = Math.floor((4 - shape[0].length) / 2);
    const offY = Math.floor((4 - shape.length) / 2);
    for (let r = 0; r < shape.length; r++)
      for (let c = 0; c < shape[r].length; c++) drawBlock(nextCtx, offX + c, offY + r, shape[r][c], BLOCK);
  }

  function loop(ts: number) {
    const dt = lastTime === null ? 0 : ts - lastTime;
    lastTime = ts;
    if (!paused && phase === "playing") {
      update(dt);
      emitStateIfChanged();
    }
    draw();
    drawNext();
    rafId = requestAnimationFrame(loop);
  }

  function togglePause() {
    if (phase === "gameover") return;
    paused = !paused;
    if (!paused) lastTime = null;
    emitStateIfChanged();
  }

  function moveLeft(down: boolean) {
    const wasHeld = keys.ArrowLeft;
    keys.ArrowLeft = down;
    if (down && !wasHeld && phase === "playing" && !paused) {
      tryMove(-1);
      leftTimer = 0;
      emitStateIfChanged();
    }
  }

  function moveRight(down: boolean) {
    const wasHeld = keys.ArrowRight;
    keys.ArrowRight = down;
    if (down && !wasHeld && phase === "playing" && !paused) {
      tryMove(1);
      rightTimer = 0;
      emitStateIfChanged();
    }
  }

  function softDrop(down: boolean) {
    const wasHeld = keys.ArrowDown;
    keys.ArrowDown = down;
    if (down && !wasHeld && phase === "playing" && !paused) {
      doSoftDrop();
      downTimer = 0;
      emitStateIfChanged();
    }
  }

  function rotate() {
    if (phase !== "playing" || paused) return;
    doRotate();
    emitStateIfChanged();
  }

  function hardDrop() {
    if (phase !== "playing" || paused) return;
    doHardDrop();
    emitStateIfChanged();
  }

  function onKeyDown(e: KeyboardEvent) {
    if (e.code === "KeyP" || e.code === "Escape") {
      togglePause();
      return;
    }
    if (paused || phase !== "playing") return;
    switch (e.code) {
      case "ArrowLeft":
        e.preventDefault();
        moveLeft(true);
        break;
      case "ArrowRight":
        e.preventDefault();
        moveRight(true);
        break;
      case "ArrowDown":
        e.preventDefault();
        softDrop(true);
        break;
      case "ArrowUp":
      case "KeyX":
        e.preventDefault();
        if (!e.repeat) rotate();
        break;
      case "Space":
        e.preventDefault();
        if (!e.repeat) hardDrop();
        break;
    }
  }

  function onKeyUp(e: KeyboardEvent) {
    switch (e.code) {
      case "ArrowLeft":
        moveLeft(false);
        break;
      case "ArrowRight":
        moveRight(false);
        break;
      case "ArrowDown":
        softDrop(false);
        break;
    }
  }

  initGame();
  emitStateIfChanged();

  return {
    start() {
      window.addEventListener("keydown", onKeyDown);
      window.addEventListener("keyup", onKeyUp);
      lastTime = null;
      rafId = requestAnimationFrame(loop);
    },
    stop() {
      if (rafId !== null) cancelAnimationFrame(rafId);
      rafId = null;
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    },
    setPaused(value: boolean) {
      if (phase === "gameover") return;
      paused = value;
      if (!value) lastTime = null;
      emitStateIfChanged();
    },
    restart() {
      initGame();
      paused = false;
      lastTime = null;
      emitStateIfChanged();
    },
    moveLeft,
    moveRight,
    softDrop,
    rotate,
    hardDrop,
  };
}
