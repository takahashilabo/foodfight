// Reproduces toio_radicon.sb3's remote-control: keyboard (WASD drives cube1,
// arrow keys drive cube2) and/or paired Joy-Cons (1st connected -> cube1,
// 2nd -> cube2) via the Gamepad API. Only sends a new BLE motor command when
// the computed wheel speeds actually change, since duration=0 keeps the
// motors running at the last commanded speed until the next write.
import { setCubeMotor } from './toio.js';
import { RADICON_FORWARD_SPEED, RADICON_TURN_SPEED } from './constants.js';
import { gamepadCubeWheelSpeeds } from './gamepad.js';

function keyboardWheelSpeeds(forwardKey, backKey, leftKey, rightKey) {
  let left = 0;
  let right = 0;
  if (keyIsDown(forwardKey)) { left += RADICON_FORWARD_SPEED; right += RADICON_FORWARD_SPEED; }
  if (keyIsDown(backKey)) { left -= RADICON_FORWARD_SPEED; right -= RADICON_FORWARD_SPEED; }
  if (keyIsDown(leftKey)) { left -= RADICON_TURN_SPEED; right += RADICON_TURN_SPEED; }
  if (keyIsDown(rightKey)) { left += RADICON_TURN_SPEED; right -= RADICON_TURN_SPEED; }
  return [left, right];
}

function combine(a, b) {
  const left = Math.max(-255, Math.min(255, a[0] + b[0]));
  const right = Math.max(-255, Math.min(255, a[1] + b[1]));
  return [left, right];
}

export function setupRadiconControls() {
  let lastCube1 = [0, 0];
  let lastCube2 = [0, 0];

  setInterval(() => {
    const [gp1, gp2] = gamepadCubeWheelSpeeds();

    const kb1 = typeof keyIsDown === 'function' ? keyboardWheelSpeeds(87, 83, 65, 68) : [0, 0]; // W,S,A,D
    const cube1 = combine(kb1, gp1);
    if (cube1[0] !== lastCube1[0] || cube1[1] !== lastCube1[1]) {
      console.log('[radicon] cube1 motor', cube1);
      setCubeMotor(1, cube1[0], cube1[1]);
      lastCube1 = cube1;
    }

    const kb2 = typeof keyIsDown === 'function' ? keyboardWheelSpeeds(38, 40, 37, 39) : [0, 0]; // Up,Down,Left,Right
    const cube2 = combine(kb2, gp2);
    if (cube2[0] !== lastCube2[0] || cube2[1] !== lastCube2[1]) {
      console.log('[radicon] cube2 motor', cube2);
      setCubeMotor(2, cube2[0], cube2[1]);
      lastCube2 = cube2;
    }
  }, 100);
}
