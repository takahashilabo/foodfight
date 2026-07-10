// localStorage-backed persistence, replacing warp.json / food.json file I/O.
// Also offers JSON export/import as a backup mechanism since localStorage
// can be cleared (browser update, "clear browsing data", etc).

const KEYS = {
  warp: 'foodfight.warp',
  food: 'foodfight.food',
  toioDevices: 'foodfight.toioDevices',
};

export function saveJSON(key, obj) {
  localStorage.setItem(key, JSON.stringify(obj));
}

export function loadJSON(key) {
  const raw = localStorage.getItem(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

export function saveWarpMat(mat16) {
  const json = {};
  for (let i = 0; i < 16; i++) json['mat' + i] = mat16[i];
  saveJSON(KEYS.warp, json);
}

export function loadWarpMat() {
  const json = loadJSON(KEYS.warp);
  if (!json) return null;
  const mat = new Array(16);
  for (let i = 0; i < 16; i++) mat[i] = json['mat' + i];
  return mat;
}

export function saveFoodLayout(foodList) {
  const json = { num: foodList.length };
  foodList.forEach((f, i) => {
    json['x' + i] = f.pos.x;
    json['y' + i] = f.pos.y;
  });
  saveJSON(KEYS.food, json);
}

export function loadFoodLayout() {
  const json = loadJSON(KEYS.food);
  if (!json) return null;
  const list = [];
  for (let i = 0; i < json.num; i++) {
    list.push({ x: json['x' + i], y: json['y' + i] });
  }
  return list;
}

export function saveToioDeviceId(slot, deviceId) {
  const map = loadJSON(KEYS.toioDevices) || {};
  map[slot] = deviceId;
  saveJSON(KEYS.toioDevices, map);
}

export function loadToioDeviceIds() {
  return loadJSON(KEYS.toioDevices) || {};
}

export function exportJSONFile(filename, obj) {
  const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function importJSONFile(onLoaded) {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'application/json';
  input.style.display = 'none';
  input.addEventListener('change', () => {
    const file = input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        onLoaded(JSON.parse(reader.result));
      } catch (e) {
        console.error('Invalid JSON file', e);
      }
    };
    reader.readAsText(file);
    document.body.removeChild(input);
  });
  document.body.appendChild(input);
  input.click();
}

export function exportWarpBackup() {
  const json = loadJSON(KEYS.warp);
  if (json) exportJSONFile('warp.json', json);
}

export function exportFoodBackup() {
  const json = loadJSON(KEYS.food);
  if (json) exportJSONFile('food.json', json);
}

export function importWarpBackup(onDone) {
  importJSONFile((json) => {
    saveJSON(KEYS.warp, json);
    if (onDone) onDone();
  });
}

export function importFoodBackup(onDone) {
  importJSONFile((json) => {
    saveJSON(KEYS.food, json);
    if (onDone) onDone();
  });
}
