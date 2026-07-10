// HUD overlay: connect / fullscreen / import-export buttons. Plain DOM code
// (not drawn on the p5 canvas) since it needs to originate real user-gesture
// events (BLE picker, file picker, fullscreen).
import { connectCube, onToioStatusChange, toioState } from './toio.js';
import { unlockAudio } from './sound.js';
import { requestFullscreenOnProjector } from './display.js';
import { getGamepadDebugInfo } from './gamepad.js';
import {
  exportWarpBackup, exportFoodBackup, importWarpBackup, importFoodBackup,
} from './storage.js';

export function setupUI() {
  const hud = document.getElementById('hud');

  const status = document.createElement('div');
  status.id = 'hud-status';
  status.textContent = 'Cube1: - / Cube2: -';
  hud.appendChild(status);

  const connect1 = makeButton('Connect Cube 1', async () => {
    unlockAudio();
    try {
      await connectCube(1);
    } catch (e) {
      console.error(e);
      alert('Cube 1 の接続に失敗しました: ' + e.message);
    }
  });

  const connect2 = makeButton('Connect Cube 2', async () => {
    unlockAudio();
    try {
      await connectCube(2);
    } catch (e) {
      console.error(e);
      alert('Cube 2 の接続に失敗しました: ' + e.message);
    }
  });

  const fullscreenBtn = makeButton('フルスクリーン(プロジェクタへ)', async () => {
    unlockAudio();
    try {
      await requestFullscreenOnProjector();
    } catch (e) {
      console.error(e);
      alert('フルスクリーンに失敗しました: ' + e.message);
    }
  });

  const exportBtn = makeButton('エクスポート', () => {
    exportWarpBackup();
    exportFoodBackup();
  });

  const importWarpBtn = makeButton('warp.json 読込', () => {
    importWarpBackup(() => location.reload());
  });

  const importFoodBtn = makeButton('food.json 読込', () => {
    importFoodBackup(() => location.reload());
  });

  hud.appendChild(connect1);
  hud.appendChild(connect2);
  hud.appendChild(fullscreenBtn);
  hud.appendChild(exportBtn);
  hud.appendChild(importWarpBtn);
  hud.appendChild(importFoodBtn);

  onToioStatusChange(({ connected1, connected2 }) => {
    status.textContent = `Cube1: ${connected1 ? '接続済' : '-'} / Cube2: ${connected2 ? '接続済' : '-'}`;
    if (connected1 && connected2) {
      hud.classList.add('hud-collapsed');
    } else {
      hud.classList.remove('hud-collapsed');
    }
  });

  setupDebugPanel();
}

// Live raw toio data readout -- separate from #hud (which fades out once
// both cubes are connected) so it stays visible for checking that BLE
// notifications are actually arriving, and for reading the raw mat-corner
// values during on-site calibration.
function setupDebugPanel() {
  const panel = document.createElement('div');
  panel.id = 'debug-panel';
  document.body.appendChild(panel);

  let lastNewDataAt = 0;
  setInterval(() => {
    if (toioState.newData) lastNewDataAt = performance.now();
    const ageSec = ((performance.now() - lastNewDataAt) / 1000).toFixed(1);
    panel.textContent =
      `Cube1 raw: x=${toioState.x1} y=${toioState.y1} angle=${toioState.angle1} onMat=${toioState.onMat1}\n` +
      `Cube2 raw: x=${toioState.x2} y=${toioState.y2} angle=${toioState.angle2} onMat=${toioState.onMat2}\n` +
      `last update: ${lastNewDataAt === 0 ? '(まだ受信なし)' : ageSec + '秒前'}`;
  }, 200);

  setupGamepadDebugPanel();
}

// Raw Gamepad API readout (id / axes / pressed button indices) for each
// connected controller, so Joy-Con axis/button assignments (which vary by
// OS/browser) can be identified and radicon.js's mapping adjusted if needed.
function setupGamepadDebugPanel() {
  const panel = document.createElement('div');
  panel.id = 'gamepad-debug-panel';
  document.body.appendChild(panel);

  setInterval(() => {
    const pads = getGamepadDebugInfo();
    if (pads.length === 0) {
      panel.textContent = 'Gamepad: (未接続 -- Joy-Conのボタンを一度押すと認識されます)';
      return;
    }
    panel.textContent = pads
      .map((p) => `#${p.index} ${p.id}\n  axes: [${p.axes.join(', ')}]\n  pressed: [${p.pressedButtons.join(', ')}]`)
      .join('\n');
  }, 200);
}

function makeButton(label, onClick) {
  const btn = document.createElement('button');
  btn.textContent = label;
  btn.addEventListener('click', onClick);
  return btn;
}
