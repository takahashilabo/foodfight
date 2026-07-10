// Port of processing/WarperManager.pde: wraps Warper with the interactive
// 4-corner calibration flow (click screen corners top-left -> clockwise).
import { Warper } from './warper.js';
import { MAT_SOURCE_CORNERS } from './constants.js';

export class WarperManager {
  constructor() {
    this.warper = new Warper();
    this.enterCalib = false;
    this.calibPosNum = 0;
    this.calib = [
      { x: 0, y: 0 },
      { x: 0, y: 0 },
      { x: 0, y: 0 },
      { x: 0, y: 0 },
    ];
    this.warper.loadWarpMat();
  }

  isCalibrating() {
    return this.enterCalib;
  }

  setCalibPos(x, y) {
    if (!this.enterCalib) return;

    this.calib[this.calibPosNum].x = x;
    this.calib[this.calibPosNum].y = y;

    this.calibPosNum++;
    if (this.calibPosNum > 3) {
      this.enterCalib = false;
      this.calibrate();
      this.warper.saveWarpMat();
    }
  }

  startCalib() {
    this.enterCalib = true;
    this.calibPosNum = 0;
  }

  drawCalib() {
    if (!this.enterCalib) return;
    strokeWeight(10);
    stroke(255, 0, 0);
    noFill();
    beginShape();
    for (let i = 0; i < this.calibPosNum; i++) {
      vertex(this.calib[i].x, this.calib[i].y);
    }
    endShape();
  }

  warp(x, y) {
    return this.warper.warp(x, y);
  }

  calibrate() {
    // raw toio-ID mat corners -> clicked screen corners
    const c = MAT_SOURCE_CORNERS;
    this.warper.setSource(c[0], c[1], c[2], c[3], c[4], c[5], c[6], c[7]);
    this.warper.setDestination(
      this.calib[0].x, this.calib[0].y,
      this.calib[1].x, this.calib[1].y,
      this.calib[2].x, this.calib[2].y,
      this.calib[3].x, this.calib[3].y
    );
    this.warper.computeWarp();
  }
}
