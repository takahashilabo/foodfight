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
// Originally this applied an extra 90° software rotation on top of the
// raw stick axes, on the assumption that the raw axes were calibrated for
// upright (console-attached) holding. Real-hardware testing showed this
// was wrong: with the rotation applied, the controls behaved as if the
// Joy-Con were held upright even though it was physically held sideways.
// Root cause: a lone Joy-Con's raw stick axes are themselves already
// calibrated relative to sideways holding (that's Nintendo's own
// single-Joy-Con reference orientation -- SL/SR act as shoulder buttons
// along the top edge). So the extra rotation here was double-rotating.
// Fixed by making this an identity passthrough. If left/right or
// forward/back ever come out swapped again on new hardware, use the
// gamepad debug panel's live axes + computed wheel-speed readout to
// re-derive the correct mapping rather than guessing blind.
function rotateForSidewaysL(x, y) {
  return [x, y];
}
function rotateForSidewaysR(x, y) {
  return [x, y];
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

// Returns [cube1WheelSpeeds, cube2WheelSpeeds] from whatever gamepad(s) are
// currently connected, handling both the combined and separate pairing cases.
export function gamepadCubeWheelSpeeds() {
  const pads = getConnectedGamepads();
  if (pads.length === 0) return [[0, 0], [0, 0]];

  if (pads.length === 1 && pads[0].axes.length >= 4) {
    // Single combined Joy-Con (L/R) gamepad: left stick (L) -> cube1, right stick (R) -> cube2.
    const gp = pads[0];
    const [x1, y1] = rotateForSidewaysL(gp.axes[0], gp.axes[1]);
    const [x2, y2] = rotateForSidewaysR(gp.axes[2], gp.axes[3]);
    return [stickToWheelSpeeds(x1, y1), stickToWheelSpeeds(x2, y2)];
  }

  // Two separate gamepads (individually-paired Joy-Cons, or anything else):
  // 1st (L) -> cube1, 2nd (R) -> cube2.
  let cube1 = [0, 0];
  let cube2 = [0, 0];
  if (pads[0]) {
    const [x, y] = rotateForSidewaysL(pads[0].axes[0] || 0, pads[0].axes[1] || 0);
    cube1 = stickToWheelSpeeds(x, y);
  }
  if (pads[1]) {
    const [x, y] = rotateForSidewaysR(pads[1].axes[0] || 0, pads[1].axes[1] || 0);
    cube2 = stickToWheelSpeeds(x, y);
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
