const canvas = document.getElementById( 'game' );
const ctx = canvas.getContext( '2d' );
const endScreen = document.getElementById( 'end-screen' );
const endMessage = document.getElementById( 'end-message' );
const restartBtn = document.getElementById( 'restart-btn' );
const endScoreEl = document.getElementById( 'end-score' );

const CANVAS_W = canvas.width;
const CANVAS_H = canvas.height;

const PADDLE_W = 100;
const PADDLE_H = 14;
const PADDLE_SPEED = 7;
const PADDLE_Y = CANVAS_H - 40;

const BALL_RADIUS = 8;

const BRICK_ROWS = 5;
const BRICK_COLS = 10;
const BRICK_W = 64;
const BRICK_H = 20;
const BRICK_GAP = 8;
const BRICK_OFFSET_TOP = 60;
const BRICK_OFFSET_LEFT = ( CANVAS_W - ( BRICK_COLS * BRICK_W + ( BRICK_COLS - 1 ) * BRICK_GAP ) ) / 2;

const ROW_COLORS = [ 'red', 'yellow', 'cyan', 'magenta', 'green' ];
const BLOCK_SCORES = { red: 10, yellow: 20, cyan: 30, magenta: 40, green: 50, hotpink: 60, brown: 50 };

let gameState = 'playing';
let paddle;
let ball;
let bricks;
let score = 0;

const keys = { left: false, right: false };

const bounceSound = new Audio( 'assets/sounds/ball-bounce.mp3' );
const breakSound = new Audio( 'assets/sounds/break-sound.mp3' );

function playSound( audio ) {
  const clone = audio.cloneNode();
  clone.volume = 0.1;
  clone.play().catch( () => {} );
}

function launchBall() {
  if ( !ball.attached ) return;
  ball.attached = false;
  ball.vx = 0;
  ball.vy = -6;
}

window.addEventListener( 'keydown', e => {
  if ( e.code === 'ArrowLeft' || e.code === 'KeyA' ) keys.left = true;
  if ( e.code === 'ArrowRight' || e.code === 'KeyD' ) keys.right = true;
  if ( e.code === 'Space' ) launchBall();
} );

window.addEventListener( 'keyup', e => {
  if ( e.code === 'ArrowLeft' || e.code === 'KeyA' ) keys.left = false;
  if ( e.code === 'ArrowRight' || e.code === 'KeyD' ) keys.right = false;
} );

canvas.addEventListener( 'click', () => launchBall() );

restartBtn.addEventListener( 'click', () => {
  endScreen.classList.add( 'hidden' );
  resetGame();
} );

function createBricks() {
  const arr = [];
  for ( let row = 0; row < BRICK_ROWS; row++ ) {
    for ( let col = 0; col < BRICK_COLS; col++ ) {
      arr.push( {
        x: BRICK_OFFSET_LEFT + col * ( BRICK_W + BRICK_GAP ),
        y: BRICK_OFFSET_TOP + row * ( BRICK_H + BRICK_GAP ),
        w: BRICK_W,
        h: BRICK_H,
        type: ROW_COLORS[ row ],
        alive: true,
        exploding: false,
        explodeStart: null,
      } );
    }
  }

  const indices = arr.map( ( _, i ) => i );
  for ( let i = indices.length - 1; i > 0; i-- ) {
    const j = Math.floor( Math.random() * ( i + 1 ) );
    [ indices[ i ], indices[ j ] ] = [ indices[ j ], indices[ i ] ];
  }
  const grayIndices = indices.slice( 0, 3 );
  const brownIndices = indices.slice( 3, 6 );
  grayIndices.forEach( i => { arr[ i ].type = 'gray'; } );
  brownIndices.forEach( i => { arr[ i ].type = 'brown'; } );

  arr.forEach( brick => {
    brick.breakable = brick.type !== 'gray';
    brick.hitsRequired = brick.type === 'brown' ? 2 : brick.type === 'gray' ? Infinity : 1;
    brick.hitsTaken = 0;
  } );

  return arr;
}

function resetGame() {
  paddle = {
    x: ( CANVAS_W - PADDLE_W ) / 2,
    y: PADDLE_Y,
    w: PADDLE_W,
    h: PADDLE_H,
    speed: PADDLE_SPEED,
  };

  ball = {
    x: paddle.x + paddle.w / 2,
    y: paddle.y - BALL_RADIUS,
    vx: 0,
    vy: 0,
    radius: BALL_RADIUS,
    attached: true,
  };

  bricks = createBricks();
  gameState = 'playing';
  score = 0;
}

function draw() {
  ctx.clearRect( 0, 0, CANVAS_W, CANVAS_H );

  bricks.forEach( brick => {
    if ( brick.alive ) {
      const spriteName = brick.type === 'brown' && brick.hitsTaken === 1 ? 'block_wood_cracked' : 'block_' + ( brick.type === 'brown' ? 'wood' : brick.type );
      drawSprite( ctx, spriteName, brick.x, brick.y, brick.w, brick.h );
    } else if ( brick.exploding ) {
      const frames = EXPLOSION_FRAMES[ brick.type ] || EXPLOSION_FRAMES.gray;
      const elapsed = performance.now() - brick.explodeStart;
      if ( elapsed >= EXPLOSION_DURATION ) {
        brick.exploding = false;
      } else {
        const frameIndex = Math.min(
          frames.length - 1,
          Math.floor( ( elapsed / EXPLOSION_DURATION ) * frames.length )
        );
        drawFrame( ctx, frames[ frameIndex ], brick.x, brick.y, brick.w, brick.h );
      }
    }
  } );

  drawSprite( ctx, 'paddle', paddle.x, paddle.y, paddle.w, paddle.h );
  drawSprite( ctx, 'ball', ball.x - ball.radius, ball.y - ball.radius, ball.radius * 2, ball.radius * 2 );

  ctx.fillStyle = '#fff';
  ctx.font = '20px sans-serif';
  ctx.textBaseline = 'top';
  ctx.fillText( `Puntaje: ${ score }`, 10, 10 );
}

function circleRectCollide( cx, cy, r, rx, ry, rw, rh ) {
  const closestX = Math.max( rx, Math.min( cx, rx + rw ) );
  const closestY = Math.max( ry, Math.min( cy, ry + rh ) );
  const dx = cx - closestX;
  const dy = cy - closestY;
  return ( dx * dx + dy * dy ) < ( r * r );
}

function showEndScreen( message ) {
  endMessage.textContent = message;
  endScoreEl.textContent = `Puntaje: ${ score }`;
  endScreen.classList.remove( 'hidden' );
}

function updateBall() {
  ball.x += ball.vx;
  ball.y += ball.vy;

  if ( ball.y - ball.radius > CANVAS_H ) {
    gameState = 'gameover';
    showEndScreen( 'Game Over' );
    return;
  }

  if ( ball.x - ball.radius < 0 ) {
    ball.x = ball.radius;
    ball.vx *= -1;
    playSound( bounceSound );
  } else if ( ball.x + ball.radius > CANVAS_W ) {
    ball.x = CANVAS_W - ball.radius;
    ball.vx *= -1;
    playSound( bounceSound );
  }

  if ( ball.y - ball.radius < 0 ) {
    ball.y = ball.radius;
    ball.vy *= -1;
    playSound( bounceSound );
  }

  if ( ball.vy > 0 && circleRectCollide( ball.x, ball.y, ball.radius, paddle.x, paddle.y, paddle.w, paddle.h ) ) {
    ball.y = paddle.y - ball.radius;
    const hitPos = ( ball.x - ( paddle.x + paddle.w / 2 ) ) / ( paddle.w / 2 );
    const speed = Math.hypot( ball.vx, ball.vy );
    const angle = hitPos * ( Math.PI / 3 );
    ball.vx = speed * Math.sin( angle );
    ball.vy = -speed * Math.cos( angle );
    playSound( bounceSound );
  }

  for ( const brick of bricks ) {
    if ( !brick.alive ) continue;
    if ( circleRectCollide( ball.x, ball.y, ball.radius, brick.x, brick.y, brick.w, brick.h ) ) {
      if ( brick.breakable ) {
        brick.hitsTaken++;
        if ( brick.hitsTaken >= brick.hitsRequired ) {
          brick.alive = false;
          brick.exploding = true;
          brick.explodeStart = performance.now();
          score += BLOCK_SCORES[ brick.type ];
          playSound( breakSound );
        } else {
          playSound( bounceSound );
        }
      } else {
        playSound( bounceSound );
      }
      const overlapLeft = ( ball.x + ball.radius ) - brick.x;
      const overlapRight = ( brick.x + brick.w ) - ( ball.x - ball.radius );
      const overlapTop = ( ball.y + ball.radius ) - brick.y;
      const overlapBottom = ( brick.y + brick.h ) - ( ball.y - ball.radius );
      const minOverlap = Math.min( overlapLeft, overlapRight, overlapTop, overlapBottom );
      if ( minOverlap === overlapLeft || minOverlap === overlapRight ) {
        ball.vx *= -1;
      } else {
        ball.vy *= -1;
      }
      if ( bricks.filter( b => b.breakable ).every( b => !b.alive ) ) {
        gameState = 'win';
        showEndScreen( '¡Ganaste!' );
      }
      break;
    }
  }
}

function update() {
  if ( gameState !== 'playing' ) return;

  if ( keys.left ) paddle.x -= paddle.speed;
  if ( keys.right ) paddle.x += paddle.speed;
  paddle.x = Math.max( 0, Math.min( CANVAS_W - paddle.w, paddle.x ) );

  if ( ball.attached ) {
    ball.x = paddle.x + paddle.w / 2;
    ball.y = paddle.y - ball.radius;
  } else {
    updateBall();
  }
}

function loop() {
  update();
  draw();
  requestAnimationFrame( loop );
}

loadSpritesheet( () => {
  resetGame();
  loop();
} );
