// Vice Harbor — all constants in one place

export const FIELD = { width: 1280, height: 720 };
export const WORLD = { width: 1280, height: 960 };
export const TILE = 64;

export const STEP = 1 / 60;

export const PLAYER = {
  radius: 12,
  speed: 180,
  health: 100,
};

export const CAR = {
  width: 36,
  height: 20,
  maxSpeed: 320,
  accel: 200,
  brake: 280,
  turnSpeed: 2.4,
  friction: 0.88,
};

export const COP = {
  radius: 12,
  footSpeed: 160,
  carMaxSpeed: 280,
  carAccel: 180,
  viewRadius: 320,
};

export const HEAT = {
  decayRate: 0.1,   // stars per second when clean
  maxStars: 5,
};

export const MISSION_TIME_LIMIT = 180; // seconds

export const PALETTE = {
  water:       '#1a4a6e',
  waterFoam:   '#1e5880',
  road:        '#3a3a3a',
  pavement:    '#4a4040',
  grass:       '#2d4a2d',
  building:    '#5a4a3a',
  buildingRoof:'#4a3a2a',
  buildingWin: '#c8b060',
  player:      '#f0e040',
  playerFoot:  '#f0e040',
  car:         '#e05030',
  carParked:   '#3060c0',
  cop:         '#3080ff',
  copCar:      '#1040cc',
  pickup:      '#40e080',
  missionMark: '#ff4040',
  missionRing: '#ff8000',
  hudBg:       'rgba(0,0,0,0.6)',
  hudText:     '#ffffff',
  hudHealth:   '#40e040',
  hudMoney:    '#f0d040',
  hudHeat:     '#ff4020',
  titleBg:     'rgba(0,0,0,0.75)',
  titleText:   '#ff6030',
  sky:         '#0a0a1a',
};

export const FONT = '"Courier New", monospace';

export const MISSIONS = [
  {
    id: 0,
    name: 'Hot Delivery',
    desc: 'Deliver package to the docks',
    reward: 500,
    start: { x: 320, y: 320 },
    target: { x: 960, y: 800 },
    failCond: 'arrested',
  },
  {
    id: 1,
    name: 'Repo Job',
    desc: 'Steal the red car at the warehouse',
    reward: 800,
    start: { x: 640, y: 400 },
    target: { x: 200, y: 700 },
    failCond: 'carDestroyed',
  },
  {
    id: 2,
    name: 'Heat Wave',
    desc: 'Escape the harbor with 3+ stars',
    reward: 1200,
    start: { x: 500, y: 500 },
    target: { x: 1100, y: 200 },
    failCond: 'died',
  },
  {
    id: 3,
    name: 'Final Run',
    desc: 'Reach the airstrip before dawn',
    reward: 2000,
    start: { x: 300, y: 600 },
    target: { x: 1150, y: 150 },
    failCond: 'died',
  },
];
