// Joy-Con (or any standard Gamepad API device) support for toio_radicon-
// style driving, as an alternative to JoyKeyMapper + keyboard.
//
// Two ways a pair of Joy-Cons can show up here, depending on how macOS/
// Chrome paired them:
//  - As ONE combined "Joy-Con (L/R)" STANDARD_GAMEPAD entry with 4 axes:
//    axes[0,1] = left stick (from the L Joy-Con), axes[2,3] = right stick
//    (from the R Joy-Con). In that case cube1 uses the left stick and
//    cube2 uses the right stick of that single gamepad.
//  - As TWO separate gamepad entries (one per Joy-Con), each with its own
//    axes[0,1]. In that case cube1 uses the 1st gamepad, cube2 the 2nd.
import { RADICON_FORWARD_SPEED, RADICON_TURN_SPEED } from './constants.js';

const DEADZONE = 0.15;

function applyDeadzone(v) {
  return Math.abs(v) < DEADZONE ? 0 : v;
}

// Joy-Cons here are held sideways (each one used as its own single
// controller), not upright.
//
// This has been guessed wrong twice before (a manual 90° rotation, then an
// identity passthrough) because axis behavior isn't consistent across
// machines/pairings. Fixed this time from actual measured data (combined
// Joy-Con (L/R) gamepad, left stick = cube1's axes[0,1]) read off the
// on-screen gamepad debug panel:
//   neutral:              axes = [0, 0, ...]
//   stick pushed forward: axes = [1, 0, ...]  (physical forward -> raw X)
//   stick pushed right:   axes = [0, 1, ...]  (physical right-turn -> raw Y)
// i.e. forward/turn come out on the raw axes with X and Y swapped relative
// to what stickToWheelSpeeds() expects (y=forward, x=turn). Swapping them
// back fixes it for the L stick (cube1). R stick (cube2) not yet
// separately measured -- if cube2 is still wrong, re-run the same
// forward/right-turn test on that stick via the debug panel rather than
// guessing, since L and R Joy-Con are physical mirror images and may not
// share the same correction.
function rotateForSidewaysL(x, y) {
  return [y, x];
}
function rotateForSidewaysR(x, y) {
  return [x, y]; // TODO: unverified for the R stick -- see comment above.
}

// x/y are raw stick axis values (-1..1) after the sideways rotation above.
function stickToWheelSpeeds(x, y) {
  const forward = applyDeadzone(y) * RADICON_FORWARD_SPEED;
  const turn = applyDeadzone(x) * RADICON_TURN_SPEED;
  const left = Math.max(-255, Math.min(255, forward - turn));
  const right = Math.max(-255, Math.min(255, forward + turn));
  return [left, right];
}

export function getConnectedGamepads() {
  const pads = navigator.getGamepads ? navigator.getGamepads() : [];
  return Array.from(pads).filter((p) => p !== null);
}

// Button-based up/down/left/right, as a more predictable alternative to the
// analog stick while its axis orientation is still being worked out.
//
// Joy-Con L has a physical D-pad (up/down/left/right) in addition to its
// stick; Joy-Con R has no D-pad but has A/B/X/Y face buttons in the same
// diamond position. Under Chromium's STANDARD_GAMEPAD mapping:
//  - D-pad: 12=up, 13=down, 14=left, 15=right.
//  - Face-button cluster: 0=bottom, 1=right, 2=left, 3=top (by physical
//    position, per the Gamepad API spec's remapping convention).
// BEST GUESS pending real-hardware confirmation -- the gamepad debug panel
// shows `pressed: [...]` with the raw index of whichever button you just
// pressed, so if a direction is wrong, press that physical button and
// read off its real index there.
const DPAD_BUTTONS = { up: 12, down: 13, left: 14, right: 15 };
const FACE_BUTTONS = { up: 3, down: 0, left: 2, right: 1 };

function isPressed(gp, index) {
  return !!(gp.buttons[index] && gp.buttons[index].pressed);
}

function buttonWheelSpeeds(gp, buttonMap) {
  if (!gp) return [0, 0];
  let left = 0;
  let right = 0;
  if (isPressed(gp, buttonMap.up)) { left += RADICON_FORWARD_SPEED; right += RADICON_FORWARD_SPEED; }
  if (isPressed(gp, buttonMap.down)) { left -= RADICON_FORWARD_SPEED; right -= RADICON_FORWARD_SPEED; }
  if (isPressed(gp, buttonMap.left)) { left -= RADICON_TURN_SPEED; right += RADICON_TURN_SPEED; }
  if (isPressed(gp, buttonMap.right)) { left += RADICON_TURN_SPEED; right -= RADICON_TURN_SPEED; }
  return [left, right];
}

function addSpeeds(a, b) {
  return [
    Math.max(-255, Math.min(255, a[0] + b[0])),
    Math.max(-255, Math.min(255, a[1] + b[1])),
  ];
}

// Returns [cube1WheelSpeeds, cube2WheelSpeeds] from whatever gamepad(s) are
// currently connected, handling both the combined and separate pairing
// cases, and combining stick + D-pad/face-button input for each cube.
export function gamepadCubeWheelSpeeds() {
  const pads = getConnectedGamepads();
  if (pads.length === 0) return [[0, 0], [0, 0]];

  if (pads.length === 1 && pads[0].axes.length >= 4) {
    // Single combined Joy-Con (L/R) gamepad: L (stick + D-pad) -> cube1,
    // R (stick + face buttons) -> cube2.
    const gp = pads[0];
    const [x1, y1] = rotateForSidewaysL(gp.axes[0], gp.axes[1]);
    const [x2, y2] = rotateForSidewaysR(gp.axes[2], gp.axes[3]);
    const cube1 = addSpeeds(stickToWheelSpeeds(x1, y1), buttonWheelSpeeds(gp, DPAD_BUTTONS));
    const cube2 = addSpeeds(stickToWheelSpeeds(x2, y2), buttonWheelSpeeds(gp, FACE_BUTTONS));
    return [cube1, cube2];
  }

  // Two separate gamepads (individually-paired Joy-Cons, or anything else):
  // 1st (L) -> cube1, 2nd (R) -> cube2.
  let cube1 = [0, 0];
  let cube2 = [0, 0];
  if (pads[0]) {
    const [x, y] = rotateForSidewaysL(pads[0].axes[0] || 0, pads[0].axes[1] || 0);
    cube1 = addSpeeds(stickToWheelSpeeds(x, y), buttonWheelSpeeds(pads[0], DPAD_BUTTONS));
  }
  if (pads[1]) {
    const [x, y] = rotateForSidewaysR(pads[1].axes[0] || 0, pads[1].axes[1] || 0);
    cube2 = addSpeeds(stickToWheelSpeeds(x, y), buttonWheelSpeeds(pads[1], FACE_BUTTONS));
  }
  return [cube1, cube2];
}

// Debug info for the on-screen overlay: id, mapping, axes, and which
// buttons are currently pressed, per connected gamepad. `mapping` matters
// for diagnosing axis-order issues: 'standard' means Chrome already
// reindexed axes/buttons to the STANDARD_GAMEPAD layout; '' (empty) means
// raw HID axis order, which can vary by OS/pairing.
export function getGamepadDebugInfo() {
  return getConnectedGamepads().map((gp) => ({
    index: gp.index,
    id: gp.id,
    mapping: gp.mapping || '(raw)',
    axes: gp.axes.map((a) => a.toFixed(2)),
    pressedButtons: gp.buttons
      .map((b, i) => (b.pressed ? i : null))
      .filter((i) => i !== null),
  }));
}

// Same as gamepadCubeWheelSpeeds() but also returns whichever intermediate
// values are useful for live on-site debugging (rotated stick x/y, before
// deadzone/scale). Used only by the debug panel.
export function getGamepadCubeDebugSpeeds() {
  const [cube1, cube2] = gamepadCubeWheelSpeeds();
  return { cube1, cube2 };
}
