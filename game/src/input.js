// Keyboard + mouse input tracker

export const keys = {};
export const mouse = { x: 0, y: 0, down: false };

export function initInput(canvas) {
  window.addEventListener('keydown', e => {
    keys[e.code] = true;
    keys[e.key.toLowerCase()] = true;
  });
  window.addEventListener('keyup', e => {
    keys[e.code] = false;
    keys[e.key.toLowerCase()] = false;
  });

  canvas.addEventListener('mousemove', e => {
    const r = canvas.getBoundingClientRect();
    const scaleX = canvas.width / r.width;
    const scaleY = canvas.height / r.height;
    mouse.x = (e.clientX - r.left) * scaleX;
    mouse.y = (e.clientY - r.top) * scaleY;
  });

  canvas.addEventListener('mousedown', () => { mouse.down = true; });
  canvas.addEventListener('mouseup',   () => { mouse.down = false; });

  // prevent context menu on right-click
  canvas.addEventListener('contextmenu', e => e.preventDefault());
}

export function isDown(...codes) {
  return codes.some(c => keys[c]);
}

export const isLeft  = () => isDown('ArrowLeft',  'KeyA', 'a');
export const isRight = () => isDown('ArrowRight', 'KeyD', 'd');
