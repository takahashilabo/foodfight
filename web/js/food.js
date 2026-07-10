// Port of processing/Food.pde
import { FOOD_NUM } from './constants.js';
import { saveFoodLayout, loadFoodLayout } from './storage.js';

export class Food {
  constructor(x, y, idx) {
    this.pos = { x, y };
    this.idx = idx !== undefined ? idx : Math.floor(Math.random() * FOOD_NUM);
  }
}

export let foodList = [];
export const foodImages = [];
let th = 0;

export function foodPreload() {
  for (let i = 0; i < FOOD_NUM; i++) {
    foodImages[i] = loadImage(`assets/images/${i}.gif`);
  }
}

export function foodInit() {
  foodList = [];
}

export function foodAdd(x, y) {
  foodList.push(new Food(x, y));
}

export function foodRemove(idx) {
  foodList.splice(idx, 1);
}

export function drawFood() {
  noStroke();
  const d = 10 * Math.sin(th);
  for (const f of foodList) {
    image(foodImages[f.idx], f.pos.x - d - 40, f.pos.y - d - 40, 80 + d * 2, 80 + d * 2);
  }
  th += 0.1;
}

export function foodSave() {
  saveFoodLayout(foodList);
}

export function foodLoad() {
  const list = loadFoodLayout();
  if (!list) return;
  foodList = list.map((pos) => new Food(pos.x, pos.y));
}
