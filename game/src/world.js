import { WORLD, TILE, PLAYER, CAR, COP, HEAT, MISSIONS } from './config.js';
import { isDown } from './input.js';

// ---- City builder ----

function isRoadCol(col) {
  // road columns: 2-3, 8-9, 14-15
  return (col >= 2 && col <= 3) || (col >= 8 && col <= 9) || (col >= 14 && col <= 15);
}

function isRoadRow(row) {
  // road rows: 2-3, 7-8, 12-13
  return (row >= 2 && row <= 3) || (row >= 7 && row <= 8) || (row >= 12 && row <= 13);
}

function isWater(col, row) {
  return col <= 1 || col >= 18 || row <= 1 || row >= 14;
}

export function buildCity(rng) {
  const cols = 20, rows = 15;
  const buildings = [];
  const roads = [];
  const water = [];
  const parkedCars = [];

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = c * TILE;
      const y = r * TILE;
      if (isWater(c, r)) {
        water.push({ x, y, w: TILE, h: TILE });
      } else if (!isRoadRow(r) && !isRoadCol(c)) {
        // building block — merge adjacent cells done per-cell for simplicity
        const bw = rng.nextInt(40, 58);
        const bh = rng.nextInt(40, 58);
        const bx = x + (TILE - bw) / 2;
        const by = y + (TILE - bh) / 2;
        const floors = rng.nextInt(1, 5);
        buildings.push({ x: bx, y: by, w: bw, h: bh, floors });
      } else {
        roads.push({ x, y, w: TILE, h: TILE });
      }
    }
  }

  // Parked cars along road edges (not blocking road centre)
  const parkSpots = [
    // horizontal road strips — park on top edge
    ...genParkSpots(rng, 2, 15, 2, 'h'), // row 2
    ...genParkSpots(rng, 2, 15, 7, 'h'), // row 7
    ...genParkSpots(rng, 2, 15, 12, 'h'),// row 12
    // vertical road strips — park on left edge
    ...genParkSpots(rng, 2, 13, 2, 'v'), // col 2
    ...genParkSpots(rng, 2, 13, 8, 'v'), // col 8
    ...genParkSpots(rng, 2, 13, 14, 'v'),// col 14
  ];

  for (const sp of parkSpots) {
    if (rng.next() < 0.35) {
      parkedCars.push({
        x: sp.x, y: sp.y,
        angle: sp.angle,
        vx: 0, vy: 0, speed: 0,
        color: rng.pick(['#3060c0','#c04040','#40a040','#c0a000','#8040c0']),
        health: 100,
        driven: false,
      });
    }
  }

  return { buildings, roads, water, parkedCars, cols, rows };
}

function genParkSpots(rng, cMin, cMax, roadTile, orient) {
  const spots = [];
  for (let t = cMin; t <= cMax; t++) {
    if (orient === 'h') {
      // park along top of horizontal road row
      spots.push({
        x: t * TILE + TILE / 2,
        y: roadTile * TILE + 6,
        angle: 0,
      });
    } else {
      spots.push({
        x: roadTile * TILE + 6,
        y: t * TILE + TILE / 2,
        angle: Math.PI / 2,
      });
    }
  }
  return spots;
}

// ---- Collision ----

export function collidesBuildings(nx, ny, radius, buildings) {
  for (const b of buildings) {
    if (nx + radius > b.x && nx - radius < b.x + b.w &&
        ny + radius > b.y && ny - radius < b.y + b.h) {
      return true;
    }
  }
  return false;
}

export function collidesWorldBounds(nx, ny, radius) {
  return nx - radius < 0 || nx + radius > WORLD.width ||
         ny - radius < 0 || ny + radius > WORLD.height;
}

// ---- Player ----

export function createPlayer(x, y) {
  return {
    x, y,
    angle: 0,
    vx: 0, vy: 0,
    health: PLAYER.health,
    money: 0,
    heat: 0,         // 0-5 stars (float)
    heatCoolTimer: 0,
    inCar: null,     // ref to car object when driving
    onFoot: true,
    fKeyWas: false,  // edge-detect for F
  };
}

// ---- Cops ----

export function createCop(x, y, inCar) {
  return {
    x, y,
    angle: 0,
    vx: 0, vy: 0,
    speed: 0,
    health: 100,
    inCar,           // null = on foot, object = driving
    state: 'patrol', // patrol | chase
    patrolAngle: Math.random() * Math.PI * 2,
    patrolTimer: 0,
  };
}

// ---- Pickups ----

export function createPickup(x, y, kind) {
  return { x, y, kind, radius: 10, taken: false };
}

// ---- World state ----

export function createWorld(rng) {
  const city = buildCity(rng);
  const player = createPlayer(512, 400);
  const pickups = [
    createPickup(400, 400, 'health'),
    createPickup(700, 300, 'money'),
    createPickup(900, 500, 'health'),
    createPickup(200, 600, 'money'),
    createPickup(1100, 300, 'money'),
  ];
  return {
    ...city,
    player,
    cops: [],
    pickups,
    missionIndex: 0,
    missionPhase: 'inactive', // inactive | active | complete | failed
    missionTimer: 0,
    gameOver: false,
    gameOverReason: '',
    wonGame: false,
    time: 0,
    seed: rng,
  };
}

// ---- Update ----

const ENTER_RADIUS = 48;
const PICKUP_RADIUS = 20;
const ARREST_RADIUS = 16;

export function updateWorld(world, dt, input, playBlip) {
  if (world.gameOver) return;
  world.time += dt;

  const p = world.player;

  // heat cooldown
  if (p.heat > 0) {
    p.heatCoolTimer += dt;
    if (p.heatCoolTimer >= 10) {
      p.heat = Math.max(0, p.heat - 1);
      p.heatCoolTimer = 0;
    }
  } else {
    p.heatCoolTimer = 0;
  }

  // spawn cops based on heat stars
  const stars = Math.floor(p.heat);
  const targetCops = stars === 0 ? 0 : stars <= 2 ? stars : stars <= 4 ? 3 : 5;
  while (world.cops.length < targetCops) {
    // spawn off-screen relative to player
    const angle = Math.random() * Math.PI * 2;
    const dist = 500 + Math.random() * 200;
    let cx = p.x + Math.cos(angle) * dist;
    let cy = p.y + Math.sin(angle) * dist;
    cx = Math.max(64, Math.min(WORLD.width - 64, cx));
    cy = Math.max(64, Math.min(WORLD.height - 64, cy));
    world.cops.push(createCop(cx, cy, null));
  }
  // remove excess cops
  while (world.cops.length > targetCops) {
    world.cops.pop();
  }

  // F key edge detect
  const fNow = input.keys['KeyF'] || input.keys['f'];
  const fEdge = fNow && !p.fKeyWas;
  p.fKeyWas = fNow;

  if (p.inCar) {
    updateDriving(world, dt, input, fEdge, playBlip);
  } else {
    updateFoot(world, dt, input, fEdge, playBlip);
  }

  // pickups
  for (const pk of world.pickups) {
    if (pk.taken) continue;
    const dx = p.x - pk.x, dy = p.y - pk.y;
    if (Math.sqrt(dx*dx + dy*dy) < PICKUP_RADIUS) {
      pk.taken = true;
      if (pk.kind === 'health') {
        p.health = Math.min(PLAYER.health, p.health + 30);
        playBlip(600, 0.08);
      } else {
        p.money += 50;
        playBlip(880, 0.06);
      }
    }
  }

  // mission logic
  updateMission(world, dt, playBlip);

  // cop AI
  for (const cop of world.cops) {
    updateCop(cop, world, dt);
  }

  // arrest check (player on foot only)
  if (p.onFoot && !p.inCar) {
    for (const cop of world.cops) {
      const dx = p.x - cop.x, dy = p.y - cop.y;
      if (Math.sqrt(dx*dx + dy*dy) < ARREST_RADIUS + 12) {
        triggerGameOver(world, 'Arrested by Harbor Patrol!', 'arrested');
        playBlip(220, 0.3);
        return;
      }
    }
  }
}

function updateFoot(world, dt, input, fEdge, playBlip) {
  const p = world.player;
  let dx = 0, dy = 0;
  if (input.keys['KeyW'] || input.keys['w'] || input.keys['ArrowUp'])    dy -= 1;
  if (input.keys['KeyS'] || input.keys['s'] || input.keys['ArrowDown'])  dy += 1;
  if (input.keys['KeyA'] || input.keys['a'] || input.keys['ArrowLeft'])  dx -= 1;
  if (input.keys['KeyD'] || input.keys['d'] || input.keys['ArrowRight']) dx += 1;

  const len = Math.sqrt(dx*dx + dy*dy);
  if (len > 0) { dx /= len; dy /= len; }

  const nx = p.x + dx * PLAYER.speed * dt;
  const ny = p.y + dy * PLAYER.speed * dt;

  if (!collidesBuildings(nx, p.y, PLAYER.radius, world.buildings) &&
      !collidesWorldBounds(nx, p.y, PLAYER.radius)) p.x = nx;
  if (!collidesBuildings(p.x, ny, PLAYER.radius, world.buildings) &&
      !collidesWorldBounds(p.x, ny, PLAYER.radius)) p.y = ny;

  if (len > 0) p.angle = Math.atan2(dy, dx);

  // enter car
  if (fEdge) {
    let best = null, bestDist = ENTER_RADIUS;
    for (const car of world.parkedCars) {
      if (car.driven) continue;
      const cdx = p.x - car.x, cdy = p.y - car.y;
      const d = Math.sqrt(cdx*cdx + cdy*cdy);
      if (d < bestDist) { best = car; bestDist = d; }
    }
    if (best) {
      p.inCar = best;
      p.onFoot = false;
      best.driven = true;
      p.heat = Math.min(HEAT.maxStars, p.heat + 1);
      p.heatCoolTimer = 0;
      playBlip(440, 0.1);
    }
  }
}

function updateDriving(world, dt, input, fEdge, playBlip) {
  const p = world.player;
  const car = p.inCar;

  const accel  = input.keys['KeyW'] || input.keys['w'] || input.keys['ArrowUp'];
  const brake  = input.keys['KeyS'] || input.keys['s'] || input.keys['ArrowDown'];
  const left   = input.keys['KeyA'] || input.keys['a'] || input.keys['ArrowLeft'];
  const right  = input.keys['KeyD'] || input.keys['d'] || input.keys['ArrowRight'];

  if (accel) car.speed += CAR.accel * dt;
  if (brake) car.speed -= CAR.brake * dt;
  car.speed *= Math.pow(CAR.friction, dt * 60);
  car.speed = Math.max(-CAR.maxSpeed * 0.4, Math.min(CAR.maxSpeed, car.speed));

  if (Math.abs(car.speed) > 10) {
    const dir = car.speed > 0 ? 1 : -1;
    if (left)  car.angle -= CAR.turnSpeed * dt * dir;
    if (right) car.angle += CAR.turnSpeed * dt * dir;
  }

  const nx = car.x + Math.cos(car.angle) * car.speed * dt;
  const ny = car.y + Math.sin(car.angle) * car.speed * dt;

  // car half-dims for AABB
  const hw = CAR.height / 2 + 2, hh = CAR.width / 2 + 2;
  const carBlocked = collidesBuildings(nx, car.y, hw, world.buildings) ||
                     collidesWorldBounds(nx, car.y, hw);
  if (!carBlocked) car.x = nx; else car.speed *= -0.3;

  const carBlocked2 = collidesBuildings(car.x, ny, hh, world.buildings) ||
                      collidesWorldBounds(car.x, ny, hh);
  if (!carBlocked2) car.y = ny; else car.speed *= -0.3;

  p.x = car.x;
  p.y = car.y;

  // exit car
  if (fEdge) {
    p.inCar = null;
    p.onFoot = true;
    car.driven = false;
    // move player beside car
    p.x = car.x + Math.cos(car.angle + Math.PI / 2) * 30;
    p.y = car.y + Math.sin(car.angle + Math.PI / 2) * 30;
    playBlip(330, 0.08);
  }
}

function updateMission(world, dt, playBlip) {
  if (world.missionIndex >= MISSIONS.length) {
    if (!world.wonGame) {
      world.wonGame = true;
      world.player.money += 500;
    }
    return;
  }

  const mission = MISSIONS[world.missionIndex];
  const p = world.player;

  if (world.missionPhase === 'inactive') {
    // auto-activate when player near start marker
    const dx = p.x - mission.start.x, dy = p.y - mission.start.y;
    if (Math.sqrt(dx*dx + dy*dy) < 60) {
      world.missionPhase = 'active';
      playBlip(660, 0.12);
    }
  } else if (world.missionPhase === 'active') {
    const dx = p.x - mission.target.x, dy = p.y - mission.target.y;
    if (Math.sqrt(dx*dx + dy*dy) < 60) {
      world.missionPhase = 'complete';
      p.money += mission.reward;
      p.heat = Math.max(0, p.heat - 1);
      playBlip(880, 0.2);
      setTimeout(() => {
        world.missionIndex++;
        world.missionPhase = 'inactive';
      }, 2000);
    }
  }
}

function triggerGameOver(world, reason, cond) {
  world.gameOver = true;
  world.gameOverReason = reason;
  if (world.missionPhase === 'active') {
    const m = MISSIONS[world.missionIndex];
    if (!m || m.failCond === cond || cond === 'arrested') {
      world.missionPhase = 'failed';
    }
  }
}

// ---- Cop AI ----

function updateCop(cop, world, dt) {
  const p = world.player;
  const stars = Math.floor(p.heat);
  const speedMult = stars >= 4 ? 1.2 : stars >= 3 ? 1.0 : 0.85;
  const dx = p.x - cop.x, dy = p.y - cop.y;
  const dist = Math.sqrt(dx*dx + dy*dy);

  if (dist < COP.viewRadius || cop.state === 'chase') {
    cop.state = 'chase';
    const ang = Math.atan2(dy, dx);
    cop.angle = ang;
    const spd = COP.footSpeed * speedMult;
    const nx = cop.x + Math.cos(ang) * spd * dt;
    const ny = cop.y + Math.sin(ang) * spd * dt;
    if (!collidesBuildings(nx, cop.y, COP.radius, world.buildings) &&
        !collidesWorldBounds(nx, cop.y, COP.radius)) cop.x = nx;
    if (!collidesBuildings(cop.x, ny, COP.radius, world.buildings) &&
        !collidesWorldBounds(cop.x, ny, COP.radius)) cop.y = ny;
  } else {
    cop.state = 'patrol';
    cop.patrolTimer -= dt;
    if (cop.patrolTimer <= 0) {
      cop.patrolAngle = Math.random() * Math.PI * 2;
      cop.patrolTimer = 1 + Math.random() * 2;
    }
    const nx = cop.x + Math.cos(cop.patrolAngle) * COP.footSpeed * 0.4 * dt;
    const ny = cop.y + Math.sin(cop.patrolAngle) * COP.footSpeed * 0.4 * dt;
    if (!collidesBuildings(nx, cop.y, COP.radius, world.buildings) &&
        !collidesWorldBounds(nx, cop.y, COP.radius)) cop.x = nx;
    if (!collidesBuildings(cop.x, ny, COP.radius, world.buildings) &&
        !collidesWorldBounds(cop.x, ny, COP.radius)) cop.y = ny;
  }
}
