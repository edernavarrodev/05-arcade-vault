const W = 800;
const H = 600;

export type AsteroidsPhase = "playing" | "dead" | "gameover";

export interface AsteroidsPowerupStatus {
  triple: number; // segundos restantes, 0 = inactivo
  shield: number;
  slow: number;
  novaCharges: number;
}

export interface AsteroidsState {
  score: number;
  lives: number;
  level: number;
  phase: AsteroidsPhase;
  powerups: AsteroidsPowerupStatus;
}

export interface AsteroidsEngine {
  start(): void;
  stop(): void;
  setPaused(paused: boolean): void;
  restart(): void;
  pressLeft(down: boolean): void;
  pressRight(down: boolean): void;
  pressThrust(down: boolean): void;
  shoot(): void;
  nova(): void;
}

const wrap = (v: number, max: number) => ((v % max) + max) % max;
const dist = (a: { x: number; y: number }, b: { x: number; y: number }) =>
  Math.hypot(a.x - b.x, a.y - b.y);
const rand = (min: number, max: number) => min + Math.random() * (max - min);
const randInt = (min: number, max: number) => Math.floor(rand(min, max + 1));

const TRACKED_KEYS = ["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"];

class Bullet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  ttl = 1.1;
  radius = 2;
  dead = false;

  constructor(x: number, y: number, angle: number) {
    this.x = x;
    this.y = y;
    const SPEED = 520;
    this.vx = Math.cos(angle) * SPEED;
    this.vy = Math.sin(angle) * SPEED;
  }

  update(dt: number) {
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

const POWERUP_TTL = 20;
const POWERUP_RADIUS = 13;
const POWERUP_SPEED = 80;
const POWERUP_TURN_TIME = 0.6;

type PowerupType = "triple" | "nova" | "shield" | "slow";

const POWERUP_TYPES: Record<
  PowerupType,
  {
    color: string;
    label: string;
    duration: number;
    spawnEvery: [number, number];
    drawIcon(ctx: CanvasRenderingContext2D, r: number): void;
  }
> = {
  triple: {
    color: "#0ff",
    label: "TRIPLE",
    duration: 10,
    spawnEvery: [12, 20],
    drawIcon(ctx, r) {
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(r * 0.7, -r * 0.5);
      ctx.moveTo(0, 0);
      ctx.lineTo(r * 0.8, 0);
      ctx.moveTo(0, 0);
      ctx.lineTo(r * 0.7, r * 0.5);
      ctx.stroke();
    },
  },
  nova: {
    color: "#f0f",
    label: "NOVA",
    duration: 0,
    spawnEvery: [35, 55],
    drawIcon(ctx, r) {
      ctx.beginPath();
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(a) * r * 0.75, Math.sin(a) * r * 0.75);
      }
      ctx.stroke();
    },
  },
  shield: {
    color: "#0f8",
    label: "ESCUDO",
    duration: 5,
    spawnEvery: [18, 28],
    drawIcon(ctx, r) {
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.6, Math.PI * 0.15, Math.PI * 0.85);
      ctx.stroke();
    },
  },
  slow: {
    color: "#fc0",
    label: "SLOW",
    duration: 6,
    spawnEvery: [22, 34],
    drawIcon(ctx, r) {
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.55, 0, Math.PI * 2);
      ctx.moveTo(0, 0);
      ctx.lineTo(0, -r * 0.4);
      ctx.moveTo(0, 0);
      ctx.lineTo(r * 0.3, r * 0.15);
      ctx.stroke();
    },
  },
};

class PowerUp {
  x: number;
  y: number;
  type: PowerupType;
  angle: number;
  turnTimer: number;
  rot: number;
  rotSpeed: number;
  ttl = POWERUP_TTL;
  radius = POWERUP_RADIUS;
  dead = false;

  constructor(x: number, y: number, type: PowerupType) {
    this.x = x;
    this.y = y;
    this.type = type;
    this.angle = rand(0, Math.PI * 2);
    this.turnTimer = rand(0.1, POWERUP_TURN_TIME);
    this.rot = rand(0, Math.PI * 2);
    this.rotSpeed = rand(-1.5, 1.5);
  }

  update(dt: number) {
    this.turnTimer -= dt;
    if (this.turnTimer <= 0) {
      this.angle += rand(-2.2, 2.2);
      this.turnTimer = rand(POWERUP_TURN_TIME * 0.6, POWERUP_TURN_TIME * 1.4);
    }
    this.x = wrap(this.x + Math.cos(this.angle) * POWERUP_SPEED * dt, W);
    this.y = wrap(this.y + Math.sin(this.angle) * POWERUP_SPEED * dt, H);
    this.rot += this.rotSpeed * dt;
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw(ctx: CanvasRenderingContext2D) {
    if (this.ttl < 5 && Math.floor(this.ttl * 8) % 2 === 0) return;

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rot);
    ctx.strokeStyle = POWERUP_TYPES[this.type].color;
    ctx.lineWidth = 1.5;
    ctx.lineJoin = "round";

    ctx.beginPath();
    ctx.moveTo(0, -this.radius);
    ctx.lineTo(this.radius, 0);
    ctx.lineTo(0, this.radius);
    ctx.lineTo(-this.radius, 0);
    ctx.closePath();
    ctx.stroke();

    POWERUP_TYPES[this.type].drawIcon(ctx, this.radius);

    ctx.restore();
  }
}

const RADII = [0, 16, 30, 50];
const SPEEDS = [0, 85, 55, 32];
const POINTS = [0, 100, 50, 20];

class Asteroid {
  x: number;
  y: number;
  size: number;
  radius: number;
  dead = false;
  vx: number;
  vy: number;
  rotSpeed: number;
  rot: number;
  verts: [number, number][] = [];

  constructor(x: number, y: number, size = 3) {
    this.x = x;
    this.y = y;
    this.size = size;
    this.radius = RADII[size];

    const angle = rand(0, Math.PI * 2);
    const speed = SPEEDS[size] + rand(-15, 15);
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.rotSpeed = rand(-1.2, 1.2);
    this.rot = rand(0, Math.PI * 2);

    const n = randInt(8, 13);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const r = this.radius * rand(0.6, 1.0);
      this.verts.push([Math.cos(a) * r, Math.sin(a) * r]);
    }
  }

  update(dt: number) {
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
    this.rot += this.rotSpeed * dt;
  }

  split(): Asteroid[] {
    if (this.size <= 1) return [];
    return [new Asteroid(this.x, this.y, this.size - 1), new Asteroid(this.x, this.y, this.size - 1)];
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rot);
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 1.5;
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(this.verts[0][0], this.verts[0][1]);
    for (let i = 1; i < this.verts.length; i++) ctx.lineTo(this.verts[i][0], this.verts[i][1]);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }
}

const TRIPLE_SPREAD = 0.22;

class Ship {
  x = W / 2;
  y = H / 2;
  angle = -Math.PI / 2;
  vx = 0;
  vy = 0;
  radius = 12;
  thrusting = false;
  invincible = 3;
  shootCooldown = 0;
  dead = false;
  timers: Record<Exclude<PowerupType, "nova">, number> = { triple: 0, shield: 0, slow: 0 };
  novaCharges = 0;

  reset() {
    this.x = W / 2;
    this.y = H / 2;
    this.angle = -Math.PI / 2;
    this.vx = 0;
    this.vy = 0;
    this.thrusting = false;
    this.invincible = 3;
    this.shootCooldown = 0;
    this.dead = false;
  }

  activate(type: PowerupType) {
    if (type === "nova") this.novaCharges++;
    else this.timers[type] = POWERUP_TYPES[type].duration;
  }

  has(type: Exclude<PowerupType, "nova">) {
    return this.timers[type] > 0;
  }

  update(dt: number, keys: Record<string, boolean>) {
    if (this.dead) return;
    if (this.invincible > 0) this.invincible -= dt;
    if (this.shootCooldown > 0) this.shootCooldown -= dt;
    for (const k of Object.keys(this.timers) as (keyof typeof this.timers)[]) {
      if (this.timers[k] > 0) this.timers[k] -= dt;
    }

    const ROT = 3.5;
    const THRUST = 260;
    const DRAG = 0.987;

    if (keys.ArrowLeft) this.angle -= ROT * dt;
    if (keys.ArrowRight) this.angle += ROT * dt;

    this.thrusting = !!keys.ArrowUp;
    if (this.thrusting) {
      this.vx += Math.cos(this.angle) * THRUST * dt;
      this.vy += Math.sin(this.angle) * THRUST * dt;
    }

    this.vx *= DRAG;
    this.vy *= DRAG;
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
  }

  tryShoot(): Bullet[] {
    if (this.shootCooldown > 0 || this.dead) return [];
    this.shootCooldown = 0.2;
    const NOSE = 21;
    const ox = this.x + Math.cos(this.angle) * NOSE;
    const oy = this.y + Math.sin(this.angle) * NOSE;
    if (this.has("triple")) {
      return [
        new Bullet(ox, oy, this.angle - TRIPLE_SPREAD),
        new Bullet(ox, oy, this.angle),
        new Bullet(ox, oy, this.angle + TRIPLE_SPREAD),
      ];
    }
    return [new Bullet(ox, oy, this.angle)];
  }

  draw(ctx: CanvasRenderingContext2D) {
    if (this.dead) return;

    if (this.has("shield")) {
      const t = this.timers.shield;
      const blink = t < 1 && Math.floor(t * 10) % 2 === 0;
      if (!blink) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.strokeStyle = POWERUP_TYPES.shield.color;
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.4 + 0.3 * Math.sin(t * 6);
        ctx.beginPath();
        ctx.arc(0, 0, this.radius + 6, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
    }

    if (this.invincible > 0 && Math.floor(this.invincible * 8) % 2 === 0) return;

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 1.5;
    ctx.lineJoin = "round";

    ctx.beginPath();
    ctx.moveTo(20, 0);
    ctx.lineTo(-12, -9);
    ctx.lineTo(-7, 0);
    ctx.lineTo(-12, 9);
    ctx.closePath();
    ctx.stroke();

    if (this.thrusting && Math.random() > 0.35) {
      ctx.beginPath();
      ctx.moveTo(-8, -4);
      ctx.lineTo(-8 - rand(6, 14), 0);
      ctx.lineTo(-8, 4);
      ctx.strokeStyle = "rgba(255, 130, 0, 0.85)";
      ctx.stroke();
    }

    ctx.restore();
  }
}

class Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  ttl: number;
  dead = false;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
    const angle = rand(0, Math.PI * 2);
    const speed = rand(30, 130);
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.life = rand(0.4, 1.1);
    this.ttl = this.life;
  }

  update(dt: number) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw(ctx: CanvasRenderingContext2D) {
    const alpha = this.ttl / this.life;
    ctx.strokeStyle = `rgba(255,255,255,${alpha.toFixed(2)})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(this.x, this.y);
    ctx.lineTo(this.x - this.vx * 0.05, this.y - this.vy * 0.05);
    ctx.stroke();
  }
}

export function createAsteroidsEngine(
  canvas: HTMLCanvasElement,
  onStateChange: (state: AsteroidsState) => void,
): AsteroidsEngine {
  const ctx2d = canvas.getContext("2d");
  if (!ctx2d) throw new Error("No se pudo obtener el contexto 2D del canvas");
  const ctx: CanvasRenderingContext2D = ctx2d;

  canvas.width = W;
  canvas.height = H;

  const keys: Record<string, boolean> = {};
  const justPressed: Record<string, boolean> = {};

  function pressed(code: string) {
    const val = !!justPressed[code];
    justPressed[code] = false;
    return val;
  }

  function onKeyDown(e: KeyboardEvent) {
    justPressed[e.code] = !keys[e.code];
    keys[e.code] = true;
    if (TRACKED_KEYS.includes(e.code)) e.preventDefault();
  }

  function onKeyUp(e: KeyboardEvent) {
    keys[e.code] = false;
  }

  let ship: Ship;
  let bullets: Bullet[];
  let asteroids: Asteroid[];
  let particles: Particle[];
  let powerUps: PowerUp[];
  let score: number;
  let lives: number;
  let level: number;
  let phase: AsteroidsPhase;
  let deadTimer: number;
  let spawnTimers: Record<PowerupType, number>;
  let paused = false;
  let rafId: number | null = null;
  let lastTime: number | null = null;
  let lastEmitted: AsteroidsState | null = null;

  function resetSpawnTimer(type: PowerupType) {
    spawnTimers[type] = rand(...POWERUP_TYPES[type].spawnEvery);
  }

  function spawnPowerUp(type: PowerupType) {
    const SAFE_DIST = 130;
    let x, y;
    do {
      x = rand(0, W);
      y = rand(0, H);
    } while (dist(ship, { x, y }) < SAFE_DIST);
    powerUps.push(new PowerUp(x, y, type));
  }

  function spawnAsteroids(count: number) {
    const SAFE_DIST = 130;
    for (let i = 0; i < count; i++) {
      let x, y;
      do {
        x = rand(0, W);
        y = rand(0, H);
      } while (Math.hypot(x - W / 2, y - H / 2) < SAFE_DIST);
      asteroids.push(new Asteroid(x, y, 3));
    }
  }

  function initGame() {
    ship = new Ship();
    bullets = [];
    asteroids = [];
    particles = [];
    powerUps = [];
    score = 0;
    lives = 3;
    level = 1;
    phase = "playing";
    spawnTimers = { triple: 0, nova: 0, shield: 0, slow: 0 };
    (Object.keys(POWERUP_TYPES) as PowerupType[]).forEach(resetSpawnTimer);
    spawnTimers.triple = rand(4, 8);
    spawnAsteroids(4);
  }

  function nextLevel() {
    level++;
    bullets = [];
    particles = [];
    powerUps = [];
    ship.reset();
    spawnAsteroids(3 + level);
    (Object.keys(POWERUP_TYPES) as PowerupType[]).forEach(resetSpawnTimer);
  }

  function explode(x: number, y: number, count = 8) {
    for (let i = 0; i < count; i++) particles.push(new Particle(x, y));
  }

  function killShip() {
    explode(ship.x, ship.y, 14);
    ship.dead = true;
    lives--;
    if (lives <= 0) {
      phase = "gameover";
    } else {
      phase = "dead";
      deadTimer = 2;
    }
  }

  function update(dt: number) {
    if (phase === "gameover") {
      if (pressed("Space")) initGame();
      particles.forEach((p) => p.update(dt));
      particles = particles.filter((p) => !p.dead);
      return;
    }

    if (phase === "dead") {
      deadTimer -= dt;
      particles.forEach((p) => p.update(dt));
      particles = particles.filter((p) => !p.dead);
      asteroids.forEach((a) => a.update(dt));
      powerUps.forEach((p) => p.update(dt));
      powerUps = powerUps.filter((p) => !p.dead);
      if (deadTimer <= 0) {
        phase = "playing";
        ship.reset();
      }
      return;
    }

    const MAX_POWERUPS_ON_SCREEN = 3;
    for (const type of Object.keys(spawnTimers) as PowerupType[]) {
      spawnTimers[type] -= dt;
      if (spawnTimers[type] <= 0) {
        if (powerUps.length < MAX_POWERUPS_ON_SCREEN) {
          spawnPowerUp(type);
          resetSpawnTimer(type);
        } else {
          spawnTimers[type] = 3;
        }
      }
    }

    if (pressed("Space")) {
      bullets.push(...ship.tryShoot());
    }

    if (pressed("KeyB") && ship.novaCharges > 0 && !ship.dead) {
      ship.novaCharges--;
      for (const a of asteroids) {
        score += POINTS[a.size];
        explode(a.x, a.y, a.size * 6);
      }
      asteroids = [];
    }

    ship.update(dt, keys);
    bullets.forEach((b) => b.update(dt));
    const asteroidDt = ship.has("slow") ? dt * 0.5 : dt;
    asteroids.forEach((a) => a.update(asteroidDt));
    particles.forEach((p) => p.update(dt));
    powerUps.forEach((p) => p.update(dt));

    bullets = bullets.filter((b) => !b.dead);
    particles = particles.filter((p) => !p.dead);
    powerUps = powerUps.filter((p) => !p.dead);

    const newAsteroids: Asteroid[] = [];
    for (const b of bullets) {
      for (const a of asteroids) {
        if (!a.dead && !b.dead && dist(b, a) < a.radius) {
          b.dead = true;
          a.dead = true;
          score += POINTS[a.size];
          explode(a.x, a.y, a.size * 5);
          newAsteroids.push(...a.split());
        }
      }
    }
    asteroids = asteroids.filter((a) => !a.dead).concat(newAsteroids);
    bullets = bullets.filter((b) => !b.dead);

    if (!ship.dead) {
      for (const p of powerUps) {
        if (!p.dead && dist(ship, p) < ship.radius + p.radius) {
          p.dead = true;
          ship.activate(p.type);
        }
      }
      powerUps = powerUps.filter((p) => !p.dead);
    }

    if (ship.invincible <= 0) {
      for (const a of asteroids) {
        if (dist(ship, a) < ship.radius + a.radius * 0.82) {
          if (ship.has("shield")) {
            ship.timers.shield = 0;
            a.dead = true;
            score += POINTS[a.size];
            explode(a.x, a.y, a.size * 5);
            ship.invincible = 0.6;
          } else {
            killShip();
          }
          break;
        }
      }
      asteroids = asteroids.filter((a) => !a.dead);
    }

    if (asteroids.length === 0) nextLevel();
  }

  function draw() {
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, W, H);

    particles.forEach((p) => p.draw(ctx));
    asteroids.forEach((a) => a.draw(ctx));
    powerUps.forEach((p) => p.draw(ctx));
    bullets.forEach((b) => b.draw(ctx));
    ship.draw(ctx);
  }

  function snapshot(): AsteroidsState {
    return {
      score,
      lives,
      level,
      phase,
      powerups: {
        triple: ship.timers.triple,
        shield: ship.timers.shield,
        slow: ship.timers.slow,
        novaCharges: ship.novaCharges,
      },
    };
  }

  function statesEqual(a: AsteroidsState, b: AsteroidsState) {
    return (
      a.score === b.score &&
      a.lives === b.lives &&
      a.level === b.level &&
      a.phase === b.phase &&
      a.powerups.triple === b.powerups.triple &&
      a.powerups.shield === b.powerups.shield &&
      a.powerups.slow === b.powerups.slow &&
      a.powerups.novaCharges === b.powerups.novaCharges
    );
  }

  function emitStateIfChanged() {
    const next = snapshot();
    if (!lastEmitted || !statesEqual(lastEmitted, next)) {
      lastEmitted = next;
      onStateChange(next);
    }
  }

  function loop(ts: number) {
    const dt = lastTime === null ? 0 : Math.min((ts - lastTime) / 1000, 0.05);
    lastTime = ts;
    if (!paused) {
      update(dt);
      emitStateIfChanged();
    }
    draw();
    rafId = requestAnimationFrame(loop);
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
      paused = value;
      if (!value) lastTime = null;
    },
    restart() {
      initGame();
      paused = false;
      lastTime = null;
      emitStateIfChanged();
    },
    pressLeft(down: boolean) {
      keys.ArrowLeft = down;
    },
    pressRight(down: boolean) {
      keys.ArrowRight = down;
    },
    pressThrust(down: boolean) {
      keys.ArrowUp = down;
    },
    shoot() {
      justPressed.Space = true;
    },
    nova() {
      justPressed.KeyB = true;
    },
  };
}
