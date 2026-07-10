// Port of processing/tukuruto_v6.pde
import { WarperManager } from './warperManager.js';
import {
  foodPreload, foodInit, foodAdd, foodRemove, foodSave, foodLoad, drawFood, foodList,
} from './food.js';
import { PG } from './particles.js';
import {
  soundPreload, soundSetup, playHitSound, playCoinSound, playGameClearSound, playBgm, stopBgm,
} from './sound.js';
import { toioState, clearNewData, tryReconnectSilently, enableMockMode } from './toio.js';
import { setupUI } from './ui.js';
import { setupRadiconControls } from './radicon.js';
import {
  HIT_RADIUS, START_ZONE_RADIUS, PLAYER1_START, PLAYER2_START, RESULT_SCREEN_FRAMES,
  MAT_MIN_X, MAT_MAX_X, MAT_MIN_Y, MAT_MAX_Y,
} from './constants.js';

let mode = 0; // screen mode
let timer = 0; // counts frames on the result screen
const score = [0, 0];
let startReq = false;

let wm;
let pgl = [];

// Centroid of the mat's 4 warped screen corners. More robust than
// wm.warp(MAT_CENTER) when the calibration has real keystone/perspective
// skew, since a projective transform doesn't generally map a source
// rectangle's midpoint to the destination quad's visual centroid.
function matScreenCorners() {
  return [
    wm.warp(MAT_MIN_X, MAT_MIN_Y),
    wm.warp(MAT_MAX_X, MAT_MIN_Y),
    wm.warp(MAT_MAX_X, MAT_MAX_Y),
    wm.warp(MAT_MIN_X, MAT_MAX_Y),
  ];
}

function matScreenCentroid() {
  const corners = matScreenCorners();
  const x = corners.reduce((sum, p) => sum + p.x, 0) / corners.length;
  const y = corners.reduce((sum, p) => sum + p.y, 0) / corners.length;
  return { x, y };
}

const isMock = new URLSearchParams(location.search).get('mock') === '1';

function preload() {
  foodPreload();
  soundPreload();
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  frameRate(30);
  ellipseMode(CENTER);
  rectMode(CENTER);
  cursor();
  textFont('PressStart2P, monospace');

  wm = new WarperManager();

  foodLoad();
  soundSetup();
  setupUI();

  if (isMock) {
    enableMockMode();
  } else {
    tryReconnectSilently();
    setupRadiconControls();
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

function draw() {
  switch (mode) {
    case 0: // calibration (map projector <-> toio mat, place food)
      if (drawCalibScreen()) return;
      background(0, 0, 0);
      drawFood();
      fill(255);
      textSize(18);
      textAlign(CENTER, CENTER);
      text('キーボードの「c」を押してキャリブしてください(左上から時計回りに四角をクリック)', width / 2, 300);
      text('キャリブが終わったらクリックして食べ物を置きます。最後に「s」を押してください', width / 2, 335);
      text('キーボードの「1」を押してください', width / 2, 370);
      textAlign(LEFT, BASELINE);
      break;

    case 1: // prepare screen
      background(0, 0, 0);
      drawFood();
      displayPlayerMarker();
      displayStartPlace();
      isStartReq();

      if (startReq) {
        initPlay();
        pgl = [];
      }
      break;

    case 2: // gameplay
      background(0, 0, 0);
      drawScore();
      drawFood();

      if (toioState.newData) {
        collision();
        clearNewData();
      }

      drawPG();
      break;

    case 3: { // result screen
      let c;
      if (score[0] > score[1]) c = color(255, 0, 255);
      else if (score[0] < score[1]) c = color(0, 255, 0);
      else c = color(255);

      stroke(c);
      background(0, 0, 0);
      strokeWeight(50);
      noFill();
      beginShape();
      let p = wm.warp(MAT_MIN_X, MAT_MIN_Y); vertex(p.x, p.y);
      p = wm.warp(MAT_MAX_X, MAT_MIN_Y); vertex(p.x, p.y);
      p = wm.warp(MAT_MAX_X, MAT_MAX_Y); vertex(p.x, p.y);
      p = wm.warp(MAT_MIN_X, MAT_MAX_Y); vertex(p.x, p.y);
      endShape(CLOSE);

      if (random(1) > 0.9) {
        p = wm.warp(random(MAT_MIN_X, MAT_MAX_X), random(MAT_MIN_Y, MAT_MAX_Y));
        pgl.push(new PG(p.x, p.y, 100, 30, 20, c));
        playCoinSound();
      }

      drawPG();

      strokeWeight(1);
      fill(255);
      textAlign(CENTER, CENTER);
      const resultStr = `Momo ${score[0]} - ${score[1]} Midori`;
      // Anchor on the centroid of the mat's 4 warped corners -- robust to
      // keystone/perspective skew in the calibration (unlike warping the
      // raw-coordinate midpoint directly, see matScreenCentroid()).
      const corners = matScreenCorners();
      const centroid = matScreenCentroid();
      const topWidth = dist(corners[0].x, corners[0].y, corners[1].x, corners[1].y);
      const bottomWidth = dist(corners[3].x, corners[3].y, corners[2].x, corners[2].y);
      const matScreenWidth = Math.min(topWidth, bottomWidth);
      const maxTextSize = 72;
      textSize(maxTextSize);
      textSize(Math.min(maxTextSize, (matScreenWidth * 0.85 / textWidth(resultStr)) * maxTextSize));
      text(resultStr, centroid.x, centroid.y);
      textAlign(LEFT, BASELINE);
      if (++timer > RESULT_SCREEN_FRAMES) initPrepare();
      break;
    }
  }
}

function drawPG() {
  for (let i = pgl.length - 1; i >= 0; i--) {
    const pg = pgl[i];
    if (pg.dead) {
      pgl.splice(i, 1);
    } else {
      pg.draw();
    }
  }
}

function drawScore() {
  fill(255);
  textSize(48);
  textAlign(CENTER, CENTER);
  // Interpolate directly in screen space between the mat's top edge and
  // its centroid (rather than warping a raw-coordinate point), so this
  // stays visually centered even under keystone/perspective skew.
  const corners = matScreenCorners();
  const topMid = { x: (corners[0].x + corners[1].x) / 2, y: (corners[0].y + corners[1].y) / 2 };
  const centroid = matScreenCentroid();
  const p = {
    x: topMid.x + (centroid.x - topMid.x) * 0.25,
    y: topMid.y + (centroid.y - topMid.y) * 0.25,
  };
  text(`Momo ${score[0]} - ${score[1]} Midori`, p.x, p.y);
  textAlign(LEFT, BASELINE);
}

function initCalib() {
  mode = 0;
  cursor();
  foodInit();
  stopBgm();
}

function initPrepare() {
  mode = 1;
  foodLoad();
  noCursor();
  stopBgm();
}

function initPlay() {
  startReq = false;
  mode = 2;
  noCursor();
  score[0] = 0;
  score[1] = 0;
  playBgm();
}

function initResult() {
  stopBgm();
  mode = 3;
  timer = 0;
}

function keyPressed() {
  switch (key) {
    case '0':
      initCalib();
      break;
    case '1':
      initPrepare();
      break;
    case '2':
      initPlay();
      pgl = [];
      break;
    case 'C':
    case 'c':
      initCalib();
      wm.startCalib();
      break;
    case 'S':
    case 's':
      foodSave();
      break;
  }
}

function mousePressed() {
  if (mode > 0) return;

  if (wm.isCalibrating()) {
    wm.setCalibPos(mouseX, mouseY);
  } else {
    foodAdd(mouseX, mouseY);
  }
}

function collision() {
  const t1 = wm.warp(toioState.x1, toioState.y1);
  const t2 = wm.warp(toioState.x2, toioState.y2);
  for (let i = foodList.length - 1; i >= 0; i--) {
    const f = foodList[i];
    if (dist(f.pos.x, f.pos.y, t1.x, t1.y) < HIT_RADIUS) {
      playHitSound();
      pgl.push(new PG(f.pos.x, f.pos.y, 100, 30, 20, color(255, 0, 255)));
      foodRemove(i);
      score[0]++;
      if (foodList.length === 0) {
        playGameClearSound();
        initResult();
      }
      continue;
    }
    if (dist(f.pos.x, f.pos.y, t2.x, t2.y) < HIT_RADIUS) {
      playHitSound();
      pgl.push(new PG(f.pos.x, f.pos.y, 100, 30, 20, color(0, 255, 0)));
      foodRemove(i);
      score[1]++;
      if (foodList.length === 0) {
        playGameClearSound();
        initResult();
      }
    }
  }
}

function drawCalibScreen() {
  if (!wm.isCalibrating()) return false;
  background(255);
  wm.drawCalib();
  noStroke();
  fill(255, 0, 0);
  text('Calibrating...', 250, 80);
  return true;
}

function displayPlayerMarker() {
  const t1 = wm.warp(toioState.x1, toioState.y1);
  fill(255, 0, 255);
  ellipse(t1.x, t1.y, 30, 30);
  const t2 = wm.warp(toioState.x2, toioState.y2);
  fill(0, 255, 0);
  ellipse(t2.x, t2.y, 30, 30);
}

function isStartReq() {
  const t1 = wm.warp(toioState.x1, toioState.y1);
  const t2 = wm.warp(toioState.x2, toioState.y2);
  const p1 = wm.warp(PLAYER1_START.x, PLAYER1_START.y);
  const p2 = wm.warp(PLAYER2_START.x, PLAYER2_START.y);
  if (dist(p1.x, p1.y, t1.x, t1.y) < START_ZONE_RADIUS && dist(p2.x, p2.y, t2.x, t2.y) < START_ZONE_RADIUS) {
    startReq = true;
  }
}

function displayStartPlace() {
  const p2 = wm.warp(PLAYER2_START.x, PLAYER2_START.y);
  const p1 = wm.warp(PLAYER1_START.x, PLAYER1_START.y);
  noFill();
  strokeWeight(10);
  stroke(0, 255, 0);
  rect(p2.x, p2.y, 100, 100);
  stroke(255, 0, 255);
  rect(p1.x, p1.y, 100, 100);
}

window.preload = preload;
window.setup = setup;
window.draw = draw;
window.windowResized = windowResized;
window.keyPressed = keyPressed;
window.mousePressed = mousePressed;
