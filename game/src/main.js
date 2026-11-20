import { FIELD } from './config.js';
import { mkRng } from './random.js';
import { keys, mouse, initInput } from './input.js';
import { createWorld, updateWorld } from './world.js';
import { render, getCamera } from './render.js';

const params = new URLSearchParams(location.search);
const SEED = parseInt(params.get('seed') || '42', 10);
const SHOT = params.get('shot') || '';

const STATE_TITLE    = 'title';
const STATE_PLAY     = 'play';
const STATE_GAMEOVER = 'gameover';

let canvas, ctx;
let state = STATE_TITLE;
let world;
let rng;
let audioCtx = null;
let camera = { x: 0, y: 0 };

function initAudio() {
  if (audioCtx) return;
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
}

function playBlip(freq = 440, dur = 0.1) {
  if (!audioCtx) return;
  const o = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  o.connect(g);
  g.connect(audioCtx.destination);
  o.frequency.value = freq;
  g.gain.setValueAtTime(0.3, audioCtx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + dur);
  o.start();
  o.stop(audioCtx.currentTime + dur);
}

function startGame() {
  rng = mkRng(SEED);
  world = createWorld(rng);
  state = STATE_PLAY;
}

function setupShotState() {
  if (SHOT === 'play') {
    // spawn player in a car at city centre, mid-drive state
    rng = mkRng(SEED);
    world = createWorld(rng);
    state = STATE_PLAY;
    const p = world.player;
    p.x = 640;
    p.y = 480;
    // put player in first available parked car
    const car = world.parkedCars.find(c => !c.driven);
    if (car) {
      car.x = 640; car.y = 480;
      car.driven = true;
      p.inCar = car;
      p.onFoot = false;
    }
    p.money = 750;
    p.heat = 2;
    world.missionIndex = 1;
    world.missionPhase = 'active';
  } else if (SHOT === 'mission') {
    rng = mkRng(SEED);
    world = createWorld(rng);
    state = STATE_PLAY;
    const p = world.player;
    p.x = 640; p.y = 480;
    p.money = 500;
    p.heat = 1;
    world.missionIndex = 0;
    world.missionPhase = 'active';
  }
}

function init() {
  canvas = document.getElementById('game');
  canvas.width  = FIELD.width;
  canvas.height = FIELD.height;
  ctx = canvas.getContext('2d');

  initInput(canvas);

  // lazy audio on first interaction
  window.addEventListener('keydown', () => { initAudio(); }, { once: true });
  canvas.addEventListener('click', () => { initAudio(); }, { once: true });

  // title screen interactions
  window.addEventListener('keydown', e => {
    if (state === STATE_TITLE && (e.code === 'Enter' || e.code === 'Space')) {
      startGame();
    }
    if ((state === STATE_PLAY || state === STATE_GAMEOVER) && e.code === 'KeyR') {
      startGame();
    }
  });
  canvas.addEventListener('click', () => {
    if (state === STATE_TITLE) startGame();
    if (state === STATE_GAMEOVER) startGame();
  });

  if (SHOT === 'start') {
    // static title screenshot — just draw once
    camera = { x: 0, y: 0 };
    render(ctx, null, camera, STATE_TITLE);
    return; // no loop
  }

  if (SHOT === 'play' || SHOT === 'mission') {
    setupShotState();
    camera = getCamera(world.player.x, world.player.y);
    render(ctx, world, camera, state);
    return; // no loop for static screenshots
  }

  // normal game loop
  let last = 0;
  function loop(ts) {
    const dt = Math.min((ts - last) / 1000, 0.05);
    last = ts;

    if (state === STATE_PLAY) {
      if (world.gameOver) {
        state = STATE_GAMEOVER;
      } else {
        updateWorld(world, dt, { keys, mouse }, playBlip);
        camera = getCamera(world.player.x, world.player.y);
      }
    }

    render(ctx, world, camera, state);
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(ts => { last = ts; requestAnimationFrame(loop); });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
