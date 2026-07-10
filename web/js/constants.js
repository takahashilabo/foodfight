// toio Core Cube BLE UUIDs (from official toio-spec)
export const TOIO_SERVICE_UUID = '10b20100-5b3b-4571-9508-cf3efcd7bbae';
export const TOIO_POSITION_CHAR_UUID = '10b20101-5b3b-4571-9508-cf3efcd7bbae';
export const TOIO_LIGHT_CHAR_UUID = '10b20103-5b3b-4571-9508-cf3efcd7bbae';
export const TOIO_MOTOR_CHAR_UUID = '10b20102-5b3b-4571-9508-cf3efcd7bbae';

// Radio-control (toio_radicon) keyboard-drive tuning.
export const RADICON_FORWARD_SPEED = 60;
export const RADICON_TURN_SPEED = 40;

// Cube LED colors, matching the on-screen player marker/particle colors
// (magenta for cube1/Momo, green for cube2/Midori).
export const PLAYER1_COLOR = [255, 0, 255];
export const PLAYER2_COLOR = [0, 255, 0];

// Raw toio Position ID mat corners used as the Warper source rectangle, in
// the same order the operator clicks screen corners: top-left, top-right,
// bottom-right, bottom-left.
//
// This project uses the official Sony/toio "TMD01SS" development play mat
// (#01-#06 side, "簡易プレイマット"), whose Position ID nominal range is
// documented directly in the manufacturer's spec sheet:
//   Start (top-left)     x=98,  y=142
//   End   (bottom-right) x=402, y=358
// https://doc.switch-science.com/media/files/a884cf63-a6f3-4ad9-b8f1-71084124a3a3.pdf
// These are the real hardware BLE Position ID values (not the separate,
// pre-centered "toio Do" coordinate convention), so no on-site measurement
// is needed for this specific mat.
export const MAT_SOURCE_CORNERS = [
  98, 142,
  402, 142,
  402, 358,
  98, 358,
];

export const MAT_MIN_X = 98;
export const MAT_MAX_X = 402;
export const MAT_MIN_Y = 142;
export const MAT_MAX_Y = 358;

// Game geometry constants (ported from tukuruto_v6.pde)
export const HIT_RADIUS = 90;
export const START_ZONE_RADIUS = 30;
// Player 1 (cube1, magenta) must reach the mat's left-of-center area;
// player 2 (cube2, green) the right-of-center area -- same relative
// placement as the original tukuruto_v6.pde's (-100,0)/(100,0), just
// re-expressed in this mat's raw (uncentered) coordinate space (center
// ~(250,250), half-width ~152).
export const PLAYER1_START = { x: 147, y: 250 };
export const PLAYER2_START = { x: 353, y: 250 };
export const RESULT_SCREEN_FRAMES = 300;
export const FOOD_NUM = 30;
