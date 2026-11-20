import { FIELD, WORLD, TILE, PALETTE, FONT, MISSIONS, CAR, PLAYER } from './config.js';

// Camera follows player with clamping
export function getCamera(px, py) {
  const cx = Math.max(0, Math.min(WORLD.width  - FIELD.width,  px - FIELD.width  / 2));
  const cy = Math.max(0, Math.min(WORLD.height - FIELD.height, py - FIELD.height / 2));
  return { x: cx, y: cy };
}

export function render(ctx, world, camera, state) {
  ctx.clearRect(0, 0, FIELD.width, FIELD.height);

  if (state === 'title') {
    drawTitle(ctx);
    return;
  }

  ctx.save();
  ctx.translate(-camera.x, -camera.y);

  drawWater(ctx, world);
  drawRoads(ctx, world);
  drawBuildings(ctx, world);
  drawPickups(ctx, world);
  drawMissionMarkers(ctx, world);
  drawParkedCars(ctx, world);
  drawCops(ctx, world);
  drawPlayer(ctx, world);

  ctx.restore();

  drawHUD(ctx, world);

  if (world.missionPhase === 'active' || world.missionPhase === 'complete' || world.missionPhase === 'failed') {
    drawMissionOverlay(ctx, world);
  }

  if (world.gameOver) {
    drawGameOver(ctx, world);
  }

  if (world.wonGame && !world.gameOver) {
    drawVictory(ctx, world);
  }
}

function drawWater(ctx, world) {
  ctx.fillStyle = PALETTE.water;
  for (const t of world.water) {
    ctx.fillRect(t.x, t.y, t.w, t.h);
  }
  // foam shimmer
  ctx.fillStyle = PALETTE.waterFoam;
  ctx.globalAlpha = 0.3;
  for (const t of world.water) {
    ctx.fillRect(t.x + 4, t.y + 4, t.w - 8, 4);
  }
  ctx.globalAlpha = 1;
}

function drawRoads(ctx, world) {
  ctx.fillStyle = PALETTE.road;
  for (const t of world.roads) {
    ctx.fillRect(t.x, t.y, t.w, t.h);
  }
  // pavement border
  ctx.strokeStyle = PALETTE.pavement;
  ctx.lineWidth = 1;
  for (const t of world.roads) {
    ctx.strokeRect(t.x + 0.5, t.y + 0.5, t.w - 1, t.h - 1);
  }
}

function drawBuildings(ctx, world) {
  for (const b of world.buildings) {
    // shadow
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fillRect(b.x + 4, b.y + 4, b.w, b.h);
    // body
    const shade = Math.min(b.floors / 5, 1);
    ctx.fillStyle = lerpColor('#3a3028', '#7a6050', shade);
    ctx.fillRect(b.x, b.y, b.w, b.h);
    // roof
    ctx.fillStyle = PALETTE.buildingRoof;
    ctx.fillRect(b.x + 2, b.y + 2, b.w - 4, b.h - 4);
    // windows
    ctx.fillStyle = PALETTE.buildingWin;
    ctx.globalAlpha = 0.7;
    const wx = b.x + 6, wy = b.y + 6;
    const cols = Math.max(1, Math.floor((b.w - 12) / 10));
    const rows = Math.max(1, Math.floor((b.h - 12) / 10));
    for (let wr = 0; wr < rows; wr++) {
      for (let wc = 0; wc < cols; wc++) {
        ctx.fillRect(wx + wc * 10, wy + wr * 10, 5, 5);
      }
    }
    ctx.globalAlpha = 1;
  }
}

function drawParkedCars(ctx, world) {
  for (const car of world.parkedCars) {
    if (car === world.player.inCar) continue; // drawn separately
    drawCar(ctx, car, car.color);
  }
}

function drawCar(ctx, car, color) {
  ctx.save();
  ctx.translate(car.x, car.y);
  ctx.rotate(car.angle);
  const hw = CAR.width / 2, hh = CAR.height / 2;
  // body
  ctx.fillStyle = color;
  ctx.fillRect(-hw, -hh, CAR.width, CAR.height);
  // windshield
  ctx.fillStyle = 'rgba(180,220,255,0.6)';
  ctx.fillRect(-hw + 4, -hh + 2, CAR.width / 3, CAR.height - 4);
  // wheels
  ctx.fillStyle = '#111';
  ctx.fillRect(-hw - 2, -hh, 5, 4);
  ctx.fillRect(-hw - 2, hh - 4, 5, 4);
  ctx.fillRect(hw - 3, -hh, 5, 4);
  ctx.fillRect(hw - 3, hh - 4, 5, 4);
  ctx.restore();
}

function drawPlayer(ctx, world) {
  const p = world.player;
  if (p.inCar) {
    drawCar(ctx, p.inCar, '#e05030');
  } else {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.angle);
    // body circle
    ctx.fillStyle = PALETTE.player;
    ctx.beginPath();
    ctx.arc(0, 0, PLAYER.radius, 0, Math.PI * 2);
    ctx.fill();
    // direction indicator
    ctx.fillStyle = '#a00000';
    ctx.fillRect(4, -3, 10, 6);
    ctx.restore();
  }
}

function drawCops(ctx, world) {
  for (const cop of world.cops) {
    ctx.save();
    ctx.translate(cop.x, cop.y);
    ctx.rotate(cop.angle);
    ctx.fillStyle = PALETTE.cop;
    ctx.beginPath();
    ctx.arc(0, 0, 12, 0, Math.PI * 2);
    ctx.fill();
    // badge
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(3, -4, 8, 8);
    ctx.fillStyle = PALETTE.cop;
    ctx.fillRect(5, -2, 4, 4);
    // direction
    ctx.fillStyle = '#0040aa';
    ctx.fillRect(5, -2, 9, 4);
    ctx.restore();
    // siren flash
    const flash = Math.floor(Date.now() / 300) % 2;
    ctx.fillStyle = flash ? '#ff2020' : '#2020ff';
    ctx.beginPath();
    ctx.arc(cop.x, cop.y - 10, 4, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawPickups(ctx, world) {
  for (const pk of world.pickups) {
    if (pk.taken) continue;
    const pulse = 0.8 + 0.2 * Math.sin(Date.now() / 300);
    ctx.save();
    ctx.globalAlpha = pulse;
    ctx.fillStyle = pk.kind === 'health' ? '#40e040' : '#f0d040';
    ctx.beginPath();
    ctx.arc(pk.x, pk.y, pk.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = `bold 10px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(pk.kind === 'health' ? '+' : '$', pk.x, pk.y);
    ctx.restore();
  }
}

function drawMissionMarkers(ctx, world) {
  if (world.wonGame) return;
  if (world.missionIndex >= MISSIONS.length) return;
  const m = MISSIONS[world.missionIndex];

  if (world.missionPhase === 'inactive') {
    drawMarker(ctx, m.start.x, m.start.y, '#00ff80', 'GO');
  } else if (world.missionPhase === 'active') {
    drawMarker(ctx, m.target.x, m.target.y, PALETTE.missionMark, 'TGT');
  }
}

function drawMarker(ctx, x, y, color, label) {
  const r = 24 + 4 * Math.sin(Date.now() / 400);
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.font = `bold 11px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, x, y);
  ctx.restore();
}

// ---- HUD ----

function drawHUD(ctx, world) {
  const p = world.player;
  const W = FIELD.width;

  // background strip
  ctx.fillStyle = PALETTE.hudBg;
  ctx.fillRect(0, 0, W, 44);

  // health bar
  ctx.fillStyle = '#333';
  ctx.fillRect(10, 8, 120, 14);
  ctx.fillStyle = PALETTE.hudHealth;
  ctx.fillRect(10, 8, Math.max(0, (p.health / 100) * 120), 14);
  ctx.strokeStyle = '#888';
  ctx.lineWidth = 1;
  ctx.strokeRect(10, 8, 120, 14);
  ctx.fillStyle = PALETTE.hudText;
  ctx.font = `bold 10px ${FONT}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('HP', 15, 15);

  // money
  ctx.fillStyle = PALETTE.hudMoney;
  ctx.font = `bold 14px ${FONT}`;
  ctx.textAlign = 'left';
  ctx.fillText(`$${p.money}`, 145, 20);

  // heat stars
  const stars = Math.floor(p.heat);
  ctx.fillStyle = PALETTE.hudText;
  ctx.font = `12px ${FONT}`;
  ctx.textAlign = 'left';
  ctx.fillText('Heat:', W - 180, 15);
  for (let i = 0; i < 5; i++) {
    ctx.fillStyle = i < stars ? PALETTE.hudHeat : '#444';
    ctx.font = `14px ${FONT}`;
    ctx.fillText('★', W - 130 + i * 18, 15);
  }

  // objective
  if (world.missionIndex < MISSIONS.length) {
    const m = MISSIONS[world.missionIndex];
    const phase = world.missionPhase;
    const obj = phase === 'inactive'
      ? `Next: ${m.name}`
      : phase === 'active'
      ? `${m.name}: ${m.desc}`
      : phase === 'complete'
      ? `✓ ${m.name} complete! +$${m.reward}`
      : `✗ ${m.name} failed`;
    ctx.fillStyle = phase === 'failed' ? '#ff4040' : phase === 'complete' ? '#40e040' : PALETTE.hudText;
    ctx.font = `11px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText(obj, W / 2, 20);
  } else if (world.wonGame) {
    ctx.fillStyle = '#f0d040';
    ctx.font = `bold 12px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText('All missions complete! Total: $' + p.money, W / 2, 20);
  }

  // controls reminder (bottom)
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(0, FIELD.height - 20, W, 20);
  ctx.fillStyle = '#888';
  ctx.font = `10px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.fillText('WASD move | F enter/exit car | mouse aim', W / 2, FIELD.height - 7);

  // brand + mission count — bottom-right
  const done = Math.min(world.missionIndex, MISSIONS.length);
  ctx.fillStyle = PALETTE.hudText;
  ctx.font = `bold 11px ${FONT}`;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  ctx.fillText(`VICE HARBOR  ${done}/${MISSIONS.length}`, W - 8, FIELD.height - 32);
}

// ---- Overlays ----

function drawMissionOverlay(ctx, world) {
  if (world.missionIndex >= MISSIONS.length) return;
  const m = MISSIONS[world.missionIndex];
  const phase = world.missionPhase;
  if (phase !== 'active' && phase !== 'complete' && phase !== 'failed') return;

  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(FIELD.width / 2 - 200, FIELD.height / 2 - 40, 400, 80);
  ctx.strokeStyle = phase === 'failed' ? '#ff4040' : phase === 'complete' ? '#40e040' : PALETTE.missionRing;
  ctx.lineWidth = 2;
  ctx.strokeRect(FIELD.width / 2 - 200, FIELD.height / 2 - 40, 400, 80);

  ctx.fillStyle = phase === 'failed' ? '#ff4040' : phase === 'complete' ? '#40e040' : '#ff8020';
  ctx.font = `bold 18px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const title = phase === 'failed' ? `MISSION FAILED: ${m.name}` :
                phase === 'complete' ? `MISSION COMPLETE: ${m.name}` :
                `MISSION: ${m.name}`;
  ctx.fillText(title, FIELD.width / 2, FIELD.height / 2 - 15);

  ctx.fillStyle = '#ccc';
  ctx.font = `13px ${FONT}`;
  const sub = phase === 'active' ? m.desc :
              phase === 'complete' ? `Reward: $${m.reward}` :
              'Mission failed!';
  ctx.fillText(sub, FIELD.width / 2, FIELD.height / 2 + 15);
}

function drawGameOver(ctx, world) {
  ctx.fillStyle = 'rgba(0,0,0,0.75)';
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);

  ctx.fillStyle = '#ff3030';
  ctx.font = `bold 48px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('GAME OVER', FIELD.width / 2, FIELD.height / 2 - 40);

  ctx.fillStyle = '#ccc';
  ctx.font = `18px ${FONT}`;
  ctx.fillText(world.gameOverReason, FIELD.width / 2, FIELD.height / 2 + 10);

  ctx.fillStyle = '#f0d040';
  ctx.font = `14px ${FONT}`;
  ctx.fillText(`Final cash: $${world.player.money}`, FIELD.width / 2, FIELD.height / 2 + 40);

  ctx.fillStyle = '#aaa';
  ctx.font = `13px ${FONT}`;
  ctx.fillText('Press R or click to restart', FIELD.width / 2, FIELD.height / 2 + 70);
}

function drawVictory(ctx, world) {
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(FIELD.width / 2 - 250, FIELD.height / 2 - 60, 500, 120);
  ctx.strokeStyle = '#f0d040';
  ctx.lineWidth = 2;
  ctx.strokeRect(FIELD.width / 2 - 250, FIELD.height / 2 - 60, 500, 120);

  ctx.fillStyle = '#f0d040';
  ctx.font = `bold 32px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('VICE HARBOR CLEARED', FIELD.width / 2, FIELD.height / 2 - 20);

  ctx.fillStyle = '#ccc';
  ctx.font = `16px ${FONT}`;
  ctx.fillText(`Total haul: $${world.player.money} — You own the harbor!`, FIELD.width / 2, FIELD.height / 2 + 20);
}

function drawTitle(ctx) {
  // Sky gradient
  const grad = ctx.createLinearGradient(0, 0, 0, FIELD.height);
  grad.addColorStop(0, '#0a0a1a');
  grad.addColorStop(0.6, '#1a1a3a');
  grad.addColorStop(1, '#2a1a0a');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);

  // city silhouette
  drawSilhouette(ctx);

  // title
  ctx.save();
  ctx.shadowColor = '#ff6030';
  ctx.shadowBlur = 30;
  ctx.fillStyle = '#ff6030';
  ctx.font = `bold 72px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('VICE HARBOR', FIELD.width / 2, FIELD.height / 2 - 80);
  ctx.restore();

  ctx.fillStyle = '#c08040';
  ctx.font = `italic 22px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.fillText('A sun-soaked open-world crime game', FIELD.width / 2, FIELD.height / 2 - 30);

  ctx.fillStyle = '#fff';
  ctx.font = `16px ${FONT}`;
  const blink = Math.floor(Date.now() / 600) % 2;
  if (blink) {
    ctx.fillText('Press ENTER or click to start', FIELD.width / 2, FIELD.height / 2 + 20);
  }

  ctx.fillStyle = '#888';
  ctx.font = `12px ${FONT}`;
  ctx.fillText('WASD / arrows to drive  |  F enter/exit car  |  Survive Harbor Patrol', FIELD.width / 2, FIELD.height / 2 + 60);

  // bottom credits
  ctx.fillStyle = '#555';
  ctx.font = `11px ${FONT}`;
  ctx.fillText('Vice Harbor  •  2024', FIELD.width / 2, FIELD.height - 20);
}

function drawSilhouette(ctx) {
  ctx.fillStyle = '#111120';
  // rough city skyline
  const buildings = [
    [0, 500, 60, 220], [60, 480, 40, 240], [100, 460, 80, 260],
    [180, 490, 50, 230], [230, 440, 70, 280], [300, 470, 60, 250],
    [360, 420, 90, 300], [450, 460, 50, 260], [500, 400, 100, 320],
    [600, 450, 60, 270], [660, 430, 80, 290], [740, 460, 55, 260],
    [795, 410, 70, 310], [865, 450, 65, 270], [930, 470, 90, 250],
    [1020, 440, 60, 280], [1080, 460, 50, 260], [1130, 480, 50, 240],
    [1180, 500, 100, 220],
  ];
  for (const [x, y, w, h] of buildings) {
    ctx.fillRect(x, y, w, FIELD.height - y);
    // antenna
    ctx.fillRect(x + w / 2 - 2, y - 20, 4, 20);
  }
}

// ---- Helpers ----

function lerpColor(a, b, t) {
  const pa = parseHex(a), pb = parseHex(b);
  const r = Math.round(pa[0] + (pb[0] - pa[0]) * t);
  const g = Math.round(pa[1] + (pb[1] - pa[1]) * t);
  const bl = Math.round(pa[2] + (pb[2] - pa[2]) * t);
  return `rgb(${r},${g},${bl})`;
}

function parseHex(h) {
  const v = parseInt(h.slice(1), 16);
  return [(v >> 16) & 0xff, (v >> 8) & 0xff, v & 0xff];
}
