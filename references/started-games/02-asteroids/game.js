'use strict';

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const W = 800;
const H = 600;

// ── Input ─────────────────────────────────────────────────────────────────────

const keys = {};
const justPressed = {};

window.addEventListener('keydown', e => {
  justPressed[e.code] = !keys[e.code];
  keys[e.code] = true;
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code))
    e.preventDefault();
});
window.addEventListener('keyup', e => { keys[e.code] = false; });

function pressed(code) {
  const val = justPressed[code];
  justPressed[code] = false;
  return val;
}

// ── Utils ─────────────────────────────────────────────────────────────────────
const wrap  = (v, max) => ((v % max) + max) % max;
const dist  = (a, b)   => Math.hypot(a.x - b.x, a.y - b.y);
const rand  = (min, max) => min + Math.random() * (max - min);
const randInt = (min, max) => Math.floor(rand(min, max + 1));

// ── Bullet ────────────────────────────────────────────────────────────────────
class Bullet {
  constructor(x, y, angle) {
    this.x = x;
    this.y = y;
    const SPEED = 520;
    this.vx = Math.cos(angle) * SPEED;
    this.vy = Math.sin(angle) * SPEED;
    this.ttl  = 1.1;
    this.radius = 2;
    this.dead = false;
  }

  update(dt) {
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw() {
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ── Power-ups ─────────────────────────────────────────────────────────────────
const POWERUP_TTL       = 20;
const POWERUP_RADIUS    = 13;
const POWERUP_SPEED     = 80;   // vaga por la pantalla, más rápido que un asteroide grande
const POWERUP_TURN_TIME = 0.6;  // segundos entre cambios de rumbo

// Config declarativa por tipo: color, etiqueta HUD, duración del efecto
// (0 = carga de un uso, no temporal), ritmo de aparición y símbolo interior.
const POWERUP_TYPES = {
  triple: {
    color: '#0ff', label: 'TRIPLE', duration: 10, spawnEvery: [12, 20],
    drawIcon(r) {
      ctx.beginPath();
      ctx.moveTo(0, 0); ctx.lineTo(r * 0.7, -r * 0.5);
      ctx.moveTo(0, 0); ctx.lineTo(r * 0.8, 0);
      ctx.moveTo(0, 0); ctx.lineTo(r * 0.7, r * 0.5);
      ctx.stroke();
    },
  },
  nova: {
    color: '#f0f', label: 'NOVA', duration: 0, spawnEvery: [35, 55],
    drawIcon(r) {
      // Estrella de 8 rayos: bomba que arrasa todo a la vez
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
    color: '#0f8', label: 'ESCUDO', duration: 5, spawnEvery: [18, 28],
    drawIcon(r) {
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.6, Math.PI * 0.15, Math.PI * 0.85);
      ctx.stroke();
    },
  },
  slow: {
    color: '#fc0', label: 'SLOW', duration: 6, spawnEvery: [22, 34],
    drawIcon(r) {
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.55, 0, Math.PI * 2);
      ctx.moveTo(0, 0); ctx.lineTo(0, -r * 0.4);
      ctx.moveTo(0, 0); ctx.lineTo(r * 0.3, r * 0.15);
      ctx.stroke();
    },
  },
};

class PowerUp {
  constructor(x, y, type) {
    this.x = x;
    this.y = y;
    this.type = type;
    this.angle = rand(0, Math.PI * 2);
    this.turnTimer = rand(0.1, POWERUP_TURN_TIME);
    this.rot = rand(0, Math.PI * 2);
    this.rotSpeed = rand(-1.5, 1.5);
    this.ttl = POWERUP_TTL;
    this.radius = POWERUP_RADIUS;
    this.dead = false;
  }

  update(dt) {
    // Movimiento errático: cambia de rumbo cada tanto, no en línea recta como un asteroide
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

  draw() {
    // Parpadeo cuando está por expirar
    if (this.ttl < 5 && Math.floor(this.ttl * 8) % 2 === 0) return;

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rot);
    ctx.strokeStyle = POWERUP_TYPES[this.type].color;
    ctx.lineWidth   = 1.5;
    ctx.lineJoin    = 'round';

    // Rombo contenedor
    ctx.beginPath();
    ctx.moveTo(0, -this.radius);
    ctx.lineTo(this.radius, 0);
    ctx.lineTo(0, this.radius);
    ctx.lineTo(-this.radius, 0);
    ctx.closePath();
    ctx.stroke();

    // Símbolo interior, propio de cada tipo
    POWERUP_TYPES[this.type].drawIcon(this.radius);

    ctx.restore();
  }
}

// ── Asteroid ──────────────────────────────────────────────────────────────────
const RADII  = [0, 16, 30, 50];   // por tamaño 1, 2, 3
const SPEEDS = [0, 85, 55, 32];   // velocidad base por tamaño
const POINTS = [0, 100, 50, 20];  // puntos por tamaño

class Asteroid {
  constructor(x, y, size = 3) {
    this.x    = x;
    this.y    = y;
    this.size = size;
    this.radius = RADII[size];
    this.dead = false;

    const angle = rand(0, Math.PI * 2);
    const speed = SPEEDS[size] + rand(-15, 15);
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.rotSpeed = rand(-1.2, 1.2);
    this.rot = rand(0, Math.PI * 2);

    // Polígono irregular
    const n = randInt(8, 13);
    this.verts = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const r = this.radius * rand(0.6, 1.0);
      this.verts.push([Math.cos(a) * r, Math.sin(a) * r]);
    }
  }

  update(dt) {
    this.x   = wrap(this.x + this.vx * dt, W);
    this.y   = wrap(this.y + this.vy * dt, H);
    this.rot += this.rotSpeed * dt;
  }

  split() {
    if (this.size <= 1) return [];
    return [
      new Asteroid(this.x, this.y, this.size - 1),
      new Asteroid(this.x, this.y, this.size - 1),
    ];
  }

  draw() {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rot);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth   = 1.5;
    ctx.lineJoin    = 'round';
    ctx.beginPath();
    ctx.moveTo(this.verts[0][0], this.verts[0][1]);
    for (let i = 1; i < this.verts.length; i++)
      ctx.lineTo(this.verts[i][0], this.verts[i][1]);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }
}

// ── Ship ──────────────────────────────────────────────────────────────────────
const TRIPLE_SPREAD = 0.22; // rad entre balas del abanico

class Ship {
  constructor() {
    // Los timers y las cargas de nova duran entre reapariciones, no se resetean en reset()
    this.timers      = { triple: 0, shield: 0, slow: 0 };
    this.novaCharges = 0;
    this.reset();
  }

  reset() {
    this.x      = W / 2;
    this.y      = H / 2;
    this.angle  = -Math.PI / 2;
    this.vx     = 0;
    this.vy     = 0;
    this.radius = 12;
    this.thrusting     = false;
    this.invincible    = 3;
    this.shootCooldown = 0;
    this.dead          = false;
  }

  activate(type) {
    if (type === 'nova') this.novaCharges++;
    else this.timers[type] = POWERUP_TYPES[type].duration;
  }

  has(type) {
    return this.timers[type] > 0;
  }

  update(dt) {
    if (this.dead) return;
    if (this.invincible    > 0) this.invincible    -= dt;
    if (this.shootCooldown > 0) this.shootCooldown -= dt;
    for (const k in this.timers) if (this.timers[k] > 0) this.timers[k] -= dt;

    const ROT   = 3.5;   // rad/s
    const THRUST = 260;  // px/s²
    const DRAG   = 0.987;

    if (keys['ArrowLeft'])  this.angle -= ROT * dt;
    if (keys['ArrowRight']) this.angle += ROT * dt;

    this.thrusting = !!keys['ArrowUp'];
    if (this.thrusting) {
      this.vx += Math.cos(this.angle) * THRUST * dt;
      this.vy += Math.sin(this.angle) * THRUST * dt;
    }

    this.vx *= DRAG;
    this.vy *= DRAG;
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
  }

  tryShoot() {
    if (this.shootCooldown > 0 || this.dead) return [];
    this.shootCooldown = 0.2;
    const NOSE = 21;
    const ox = this.x + Math.cos(this.angle) * NOSE;
    const oy = this.y + Math.sin(this.angle) * NOSE;
    if (this.has('triple')) {
      return [
        new Bullet(ox, oy, this.angle - TRIPLE_SPREAD),
        new Bullet(ox, oy, this.angle),
        new Bullet(ox, oy, this.angle + TRIPLE_SPREAD),
      ];
    }
    return [new Bullet(ox, oy, this.angle)];
  }

  draw() {
    if (this.dead) return;

    // Círculo de energía del escudo: se dibuja fuera del giro de la nave y
    // sobrevive al parpadeo de invencibilidad de reaparición.
    if (this.has('shield')) {
      const t = this.timers.shield;
      const blink = t < 1 && Math.floor(t * 10) % 2 === 0;
      if (!blink) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.strokeStyle = POWERUP_TYPES.shield.color;
        ctx.lineWidth   = 2;
        ctx.globalAlpha = 0.4 + 0.3 * Math.sin(t * 6);
        ctx.beginPath();
        ctx.arc(0, 0, this.radius + 6, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
    }

    // Parpadeo durante invencibilidad de reaparición
    if (this.invincible > 0 && Math.floor(this.invincible * 8) % 2 === 0) return;

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth   = 1.5;
    ctx.lineJoin    = 'round';

    // Silueta clásica: triángulo con muesca trasera
    ctx.beginPath();
    ctx.moveTo( 20,  0);   // nariz
    ctx.lineTo(-12, -9);   // ala izquierda
    ctx.lineTo( -7,  0);   // muesca trasera
    ctx.lineTo(-12,  9);   // ala derecha
    ctx.closePath();
    ctx.stroke();

    // Llama del propulsor
    if (this.thrusting && Math.random() > 0.35) {
      ctx.beginPath();
      ctx.moveTo(-8, -4);
      ctx.lineTo(-8 - rand(6, 14), 0);
      ctx.lineTo(-8,  4);
      ctx.strokeStyle = 'rgba(255, 130, 0, 0.85)';
      ctx.stroke();
    }

    ctx.restore();
  }
}

// ── Partículas (explosión) ────────────────────────────────────────────────────
class Particle {
  constructor(x, y) {
    this.x  = x;
    this.y  = y;
    const angle = rand(0, Math.PI * 2);
    const speed = rand(30, 130);
    this.vx   = Math.cos(angle) * speed;
    this.vy   = Math.sin(angle) * speed;
    this.life = rand(0.4, 1.1);
    this.ttl  = this.life;
    this.dead = false;
  }

  update(dt) {
    this.x  += this.vx * dt;
    this.y  += this.vy * dt;
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw() {
    const alpha = this.ttl / this.life;
    ctx.strokeStyle = `rgba(255,255,255,${alpha.toFixed(2)})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(this.x, this.y);
    ctx.lineTo(this.x - this.vx * 0.05, this.y - this.vy * 0.05);
    ctx.stroke();
  }
}

// ── Estado del juego ──────────────────────────────────────────────────────────
let ship, bullets, asteroids, particles, powerUps;
let score, lives, level;
let state;      // 'playing' | 'dead' | 'gameover'
let deadTimer;
let spawnTimers; // { triple, nova, shield, slow }: segundos hasta la próxima aparición de cada tipo

function resetSpawnTimer(type) {
  spawnTimers[type] = rand(...POWERUP_TYPES[type].spawnEvery);
}

function spawnPowerUp(type) {
  const SAFE_DIST = 130;
  let x, y;
  do {
    x = rand(0, W);
    y = rand(0, H);
  } while (dist(ship, { x, y }) < SAFE_DIST);
  powerUps.push(new PowerUp(x, y, type));
}

function spawnAsteroids(count) {
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
  ship          = new Ship();
  bullets   = [];
  asteroids = [];
  particles = [];
  powerUps  = [];
  score  = 0;
  lives  = 3;
  level  = 1;
  state  = 'playing';
  spawnTimers = {};
  for (const type in POWERUP_TYPES) resetSpawnTimer(type);
  spawnTimers.triple = rand(4, 8); // el triple aparece pronto para que se note
  spawnAsteroids(4);
}

function nextLevel() {
  level++;
  bullets   = [];
  particles = [];
  powerUps  = [];
  ship.reset();
  spawnAsteroids(3 + level);
  for (const type in POWERUP_TYPES) resetSpawnTimer(type);
}

function explode(x, y, count = 8) {
  for (let i = 0; i < count; i++) particles.push(new Particle(x, y));
}

function killShip() {
  explode(ship.x, ship.y, 14);
  ship.dead = true;
  lives--;
  if (lives <= 0) {
    state = 'gameover';
  } else {
    state     = 'dead';
    deadTimer = 2;
  }
}

// ── Update ────────────────────────────────────────────────────────────────────
function update(dt) {
  if (state === 'gameover') {
    if (pressed('Space')) initGame();
    particles.forEach(p => p.update(dt));
    particles = particles.filter(p => !p.dead);
    return;
  }

  if (state === 'dead') {
    deadTimer -= dt;
    particles.forEach(p => p.update(dt));
    particles = particles.filter(p => !p.dead);
    asteroids.forEach(a => a.update(dt));
    powerUps.forEach(p => p.update(dt));
    powerUps = powerUps.filter(p => !p.dead);
    if (deadTimer <= 0) { state = 'playing'; ship.reset(); }
    return;
  }

  // Aparición de power-ups: cada tipo con su propio reloj independiente
  const MAX_POWERUPS_ON_SCREEN = 3;
  for (const type in spawnTimers) {
    spawnTimers[type] -= dt;
    if (spawnTimers[type] <= 0) {
      if (powerUps.length < MAX_POWERUPS_ON_SCREEN) {
        spawnPowerUp(type);
        resetSpawnTimer(type);
      } else {
        spawnTimers[type] = 3; // pantalla saturada, reintenta pronto
      }
    }
  }

  // Disparar
  if (pressed('Space')) {
    bullets.push(...ship.tryShoot());
  }

  // Bomba nova: detona una carga guardada, destruye todo lo visible sin dividir
  if (pressed('KeyB') && ship.novaCharges > 0 && !ship.dead) {
    ship.novaCharges--;
    for (const a of asteroids) {
      score += POINTS[a.size];
      explode(a.x, a.y, a.size * 6);
    }
    asteroids = [];
  }

  ship.update(dt);
  bullets.forEach(b => b.update(dt));
  // Slow motion: solo afecta a los asteroides, nave y balas van a velocidad normal
  const asteroidDt = ship.has('slow') ? dt * 0.5 : dt;
  asteroids.forEach(a => a.update(asteroidDt));
  particles.forEach(p => p.update(dt));
  powerUps.forEach(p => p.update(dt));

  bullets   = bullets.filter(b => !b.dead);
  particles = particles.filter(p => !p.dead);
  powerUps  = powerUps.filter(p => !p.dead);

  // Bala vs asteroide
  const newAsteroids = [];
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
  asteroids = asteroids.filter(a => !a.dead).concat(newAsteroids);
  bullets   = bullets.filter(b => !b.dead);

  // Nave vs power-up
  if (!ship.dead) {
    for (const p of powerUps) {
      if (!p.dead && dist(ship, p) < ship.radius + p.radius) {
        p.dead = true;
        ship.activate(p.type);
      }
    }
    powerUps = powerUps.filter(p => !p.dead);
  }

  // Nave vs asteroide
  if (ship.invincible <= 0) {
    for (const a of asteroids) {
      if (dist(ship, a) < ship.radius + a.radius * 0.82) {
        if (ship.has('shield')) {
          // El escudo absorbe el golpe: pulveriza el asteroide sin dividirlo
          ship.timers.shield = 0;
          a.dead = true;
          score += POINTS[a.size];
          explode(a.x, a.y, a.size * 5);
          ship.invincible = 0.6; // gracia corta para no morir con un vecino
        } else {
          killShip();
        }
        break;
      }
    }
    asteroids = asteroids.filter(a => !a.dead);
  }

  // Nivel completado
  if (asteroids.length === 0) nextLevel();
}

// ── Draw ──────────────────────────────────────────────────────────────────────
function drawLifeIcon(x, y) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-Math.PI / 2);
  ctx.strokeStyle = '#fff';
  ctx.lineWidth   = 1.2;
  ctx.lineJoin    = 'round';
  ctx.beginPath();
  ctx.moveTo( 9,  0);
  ctx.lineTo(-6, -5);
  ctx.lineTo(-3,  0);
  ctx.lineTo(-6,  5);
  ctx.closePath();
  ctx.stroke();
  ctx.restore();
}

function drawHUD() {
  ctx.fillStyle = '#fff';
  ctx.font = '15px monospace';

  ctx.textAlign = 'left';
  ctx.fillText(`SCORE  ${score}`, 14, 26);

  ctx.textAlign = 'center';
  ctx.fillText(`NIVEL ${level}`, W / 2, 26);

  for (let i = 0; i < lives; i++)
    drawLifeIcon(W - 16 - i * 22, 18);

  // Lista de efectos activos, uno por línea
  ctx.textAlign = 'center';
  let y = 46;
  for (const type in ship.timers) {
    if (ship.timers[type] > 0) {
      ctx.fillStyle = POWERUP_TYPES[type].color;
      ctx.fillText(`${POWERUP_TYPES[type].label} ${ship.timers[type].toFixed(1)}s`, W / 2, y);
      y += 18;
    }
  }
  if (ship.novaCharges > 0) {
    ctx.fillStyle = POWERUP_TYPES.nova.color;
    ctx.fillText(`NOVA x${ship.novaCharges} [B]`, W / 2, y);
  }
  ctx.fillStyle = '#fff';
}

function drawOverlay(title, sub) {
  ctx.textAlign   = 'center';
  ctx.fillStyle   = '#fff';
  ctx.font        = 'bold 46px monospace';
  ctx.fillText(title, W / 2, H / 2 - 18);
  ctx.font        = '18px monospace';
  ctx.fillStyle   = 'rgba(255,255,255,0.65)';
  ctx.fillText(sub, W / 2, H / 2 + 22);
}

function draw() {
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);

  particles.forEach(p => p.draw());
  asteroids.forEach(a => a.draw());
  powerUps.forEach(p => p.draw());
  bullets.forEach(b => b.draw());
  ship.draw();

  drawHUD();

  if (state === 'gameover')
    drawOverlay('GAME OVER', `PUNTAJE: ${score}   —   ESPACIO PARA REINICIAR`);
}

// ── Loop principal ────────────────────────────────────────────────────────────
let lastTime = null;

function loop(ts) {
  const dt = lastTime === null ? 0 : Math.min((ts - lastTime) / 1000, 0.05);
  lastTime = ts;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}

initGame();
requestAnimationFrame(loop);
