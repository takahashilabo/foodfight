// Web Bluetooth connection layer for two toio Core Cubes.
// Replaces Server.pde (WebSocket server) + chrome拡張/a.js (DOM scraping) +
// toio_scratch entirely. Exposes the same shape the old Processing globals
// had (toio_x1/y1/x2/y2 + newData) so the rest of the port stays mechanical.
import {
  TOIO_SERVICE_UUID, TOIO_POSITION_CHAR_UUID, TOIO_LIGHT_CHAR_UUID, TOIO_MOTOR_CHAR_UUID,
  PLAYER1_COLOR, PLAYER2_COLOR,
} from './constants.js';
import { saveToioDeviceId, loadToioDeviceIds } from './storage.js';

// "Turn on light" (single-color) command. duration=0 means the light stays
// on indefinitely, until another light command is sent.
function buildLightCommand(r, g, b) {
  return new Uint8Array([0x03, 0x00, 0x01, 0x01, r, g, b]);
}

// "Motor control with specified duration" command. duration=0 means the
// motors keep running at the given speed until the next write.
function buildMotorCommand(leftSpeed, rightSpeed) {
  const leftDir = leftSpeed >= 0 ? 0x01 : 0x02;
  const rightDir = rightSpeed >= 0 ? 0x01 : 0x02;
  const leftMag = Math.min(255, Math.abs(Math.round(leftSpeed)));
  const rightMag = Math.min(255, Math.abs(Math.round(rightSpeed)));
  return new Uint8Array([0x02, 0x01, leftDir, leftMag, 0x02, rightDir, rightMag, 0x00]);
}

export const toioState = {
  x1: 0, y1: 0, angle1: 0, onMat1: false,
  x2: 0, y2: 0, angle2: 0, onMat2: false,
  newData: false,
};

export function clearNewData() {
  toioState.newData = false;
}

class Cube {
  constructor(slot) {
    this.slot = slot;
    this.device = null;
    this.characteristic = null;
    this.motorCharacteristic = null;
    this.connected = false;
  }

  async connectDevice(device) {
    this.device = device;
    device.addEventListener('gattserverdisconnected', () => this.handleDisconnect());

    const server = await device.gatt.connect();
    const service = await server.getPrimaryService(TOIO_SERVICE_UUID);
    this.characteristic = await service.getCharacteristic(TOIO_POSITION_CHAR_UUID);
    await this.characteristic.startNotifications();
    this.characteristic.addEventListener('characteristicvaluechanged', (e) =>
      this.handleNotification(e.target.value)
    );

    const lightChar = await service.getCharacteristic(TOIO_LIGHT_CHAR_UUID);
    const [r, g, b] = this.slot === 1 ? PLAYER1_COLOR : PLAYER2_COLOR;
    await lightChar.writeValue(buildLightCommand(r, g, b));

    this.motorCharacteristic = await service.getCharacteristic(TOIO_MOTOR_CHAR_UUID);

    this.connected = true;
    saveToioDeviceId(this.slot, device.id);
    onStatusChange();
  }

  async setMotor(leftSpeed, rightSpeed) {
    if (!this.motorCharacteristic) return;
    const cmd = buildMotorCommand(leftSpeed, rightSpeed);
    try {
      // The Motor characteristic only supports "Write Without Response"
      // (unlike Light/Indicator, which supports a normal acknowledged
      // Write) -- writeValue() defaults to write-with-response semantics
      // in current browsers and silently fails against this characteristic.
      if (this.motorCharacteristic.writeValueWithoutResponse) {
        await this.motorCharacteristic.writeValueWithoutResponse(cmd);
      } else {
        await this.motorCharacteristic.writeValue(cmd);
      }
    } catch (e) {
      console.error(`Motor write failed for cube ${this.slot}`, e);
    }
  }

  handleNotification(dataView) {
    const type = dataView.getUint8(0);
    if (type === 0x01) {
      // Position ID: cube is on the mat
      const x = dataView.getUint16(1, true);
      const y = dataView.getUint16(3, true);
      const angle = dataView.getUint16(5, true);
      if (this.slot === 1) {
        toioState.x1 = x;
        toioState.y1 = y;
        toioState.angle1 = angle;
        toioState.onMat1 = true;
      } else {
        toioState.x2 = x;
        toioState.y2 = y;
        toioState.angle2 = angle;
        toioState.onMat2 = true;
      }
      toioState.newData = true;
    } else if (type === 0x03) {
      // Position ID missed: cube lifted off the mat -- freeze last known
      // position rather than snapping to (0,0), which would register a
      // false collision.
      if (this.slot === 1) toioState.onMat1 = false;
      else toioState.onMat2 = false;
    }
  }

  async handleDisconnect() {
    this.connected = false;
    onStatusChange();
    // simple reconnect with backoff
    for (const delayMs of [500, 1000, 2000, 4000]) {
      await new Promise((r) => setTimeout(r, delayMs));
      try {
        await this.connectDevice(this.device);
        return;
      } catch (e) {
        // keep retrying
      }
    }
  }
}

const cubes = { 1: new Cube(1), 2: new Cube(2) };

// toio_radicon-style keyboard drive: sets left/right wheel speed for the
// given cube (-255..255, negative = backward). No-op if that cube isn't
// connected to a real device (e.g. mock mode).
export function setCubeMotor(slot, leftSpeed, rightSpeed) {
  cubes[slot].setMotor(leftSpeed, rightSpeed);
}

let statusListener = null;
export function onToioStatusChange(cb) {
  statusListener = cb;
}
function onStatusChange() {
  if (statusListener) statusListener(getStatus());
}

export function getStatus() {
  return {
    connected1: cubes[1].connected,
    connected2: cubes[2].connected,
  };
}

// Must be called from a user-gesture handler (e.g. a button onclick).
export async function connectCube(slot) {
  const device = await navigator.bluetooth.requestDevice({
    filters: [{ namePrefix: 'toio' }],
    optionalServices: [TOIO_SERVICE_UUID],
  });
  await cubes[slot].connectDevice(device);
}

// No user gesture required: reconnects to devices the browser already
// granted permission for, via navigator.bluetooth.getDevices().
export async function tryReconnectSilently() {
  if (!navigator.bluetooth || !navigator.bluetooth.getDevices) return;
  const savedIds = loadToioDeviceIds();
  const devices = await navigator.bluetooth.getDevices();
  for (const device of devices) {
    for (const slot of [1, 2]) {
      if (savedIds[slot] === device.id && !cubes[slot].connected) {
        try {
          await cubes[slot].connectDevice(device);
        } catch (e) {
          console.warn(`Silent reconnect failed for cube ${slot}`, e);
        }
      }
    }
  }
}

// ---- Mock mode (?mock=1): fake toioState from keyboard, for developing
// and testing game logic without real toio hardware on hand. Cube 1 = WASD,
// Cube 2 = arrow keys.
export function enableMockMode() {
  // Start near PLAYER1_START/PLAYER2_START in the mat's raw (uncentered)
  // Position ID coordinate space (see constants.js / MAT_SOURCE_CORNERS).
  toioState.x1 = 147;
  toioState.y1 = 250;
  toioState.onMat1 = true;
  toioState.x2 = 353;
  toioState.y2 = 250;
  toioState.onMat2 = true;

  const speed = 4;
  setInterval(() => {
    if (typeof keyIsDown !== 'function') return;
    let moved = false;
    if (keyIsDown(65)) { toioState.x1 -= speed; moved = true; } // A
    if (keyIsDown(68)) { toioState.x1 += speed; moved = true; } // D
    if (keyIsDown(87)) { toioState.y1 -= speed; moved = true; } // W
    if (keyIsDown(83)) { toioState.y1 += speed; moved = true; } // S
    if (keyIsDown(37)) { toioState.x2 -= speed; moved = true; } // Left
    if (keyIsDown(39)) { toioState.x2 += speed; moved = true; } // Right
    if (keyIsDown(38)) { toioState.y2 -= speed; moved = true; } // Up
    if (keyIsDown(40)) { toioState.y2 += speed; moved = true; } // Down
    if (moved) toioState.newData = true;
  }, 33);

  cubes[1].connected = true;
  cubes[2].connected = true;
  onStatusChange();
}
