// Port of processing/Warper.pde: a projective (quad-to-quad) 2D coordinate
// transform, stored as a flat 16-element array (same layout as the
// Processing original, only indices 0,1,3,4,5,7,12,13,15 are meaningful).
import { saveWarpMat, loadWarpMat } from './storage.js';

export class Warper {
  constructor() {
    this.srcX = [0, 0, 0, 0];
    this.srcY = [0, 0, 0, 0];
    this.dstX = [0, 0, 0, 0];
    this.dstY = [0, 0, 0, 0];
    this.srcMat = new Array(16).fill(0);
    this.dstMat = new Array(16).fill(0);
    this.warpMat = new Array(16).fill(0);
    this.dirty = false;
    this.setIdentity();
  }

  setIdentity() {
    this.setSource(0, 0, 1, 0, 0, 1, 1, 1);
    this.setDestination(0, 0, 1, 0, 0, 1, 1, 1);
    this.computeWarp();
  }

  setSource(x0, y0, x1, y1, x2, y2, x3, y3) {
    this.srcX = [x0, x1, x2, x3];
    this.srcY = [y0, y1, y2, y3];
    this.dirty = true;
  }

  setDestination(x0, y0, x1, y1, x2, y2, x3, y3) {
    this.dstX = [x0, x1, x2, x3];
    this.dstY = [y0, y1, y2, y3];
    this.dirty = true;
  }

  computeWarp() {
    this.computeQuadToSquare(
      this.srcX[0], this.srcY[0], this.srcX[1], this.srcY[1],
      this.srcX[2], this.srcY[2], this.srcX[3], this.srcY[3], this.srcMat
    );
    this.computeSquareToQuad(
      this.dstX[0], this.dstY[0], this.dstX[1], this.dstY[1],
      this.dstX[2], this.dstY[2], this.dstX[3], this.dstY[3], this.dstMat
    );
    this.multMats(this.srcMat, this.dstMat, this.warpMat);
    this.dirty = false;
  }

  multMats(srcMat, dstMat, resMat) {
    for (let r = 0; r < 4; r++) {
      const ri = r * 4;
      for (let c = 0; c < 4; c++) {
        resMat[ri + c] =
          srcMat[ri] * dstMat[c] +
          srcMat[ri + 1] * dstMat[c + 4] +
          srcMat[ri + 2] * dstMat[c + 8] +
          srcMat[ri + 3] * dstMat[c + 12];
      }
    }
  }

  computeSquareToQuad(x0, y0, x1, y1, x2, y2, x3, y3, mat) {
    const dx1 = x1 - x2, dy1 = y1 - y2;
    const dx2 = x3 - x2, dy2 = y3 - y2;
    const sx = x0 - x1 + x2 - x3;
    const sy = y0 - y1 + y2 - y3;
    const g = (sx * dy2 - dx2 * sy) / (dx1 * dy2 - dx2 * dy1);
    const h = (dx1 * sy - sx * dy1) / (dx1 * dy2 - dx2 * dy1);
    const a = x1 - x0 + g * x1;
    const b = x3 - x0 + h * x3;
    const c = x0;
    const d = y1 - y0 + g * y1;
    const e = y3 - y0 + h * y3;
    const f = y0;

    mat[0] = a;  mat[1] = d;  mat[2] = 0;  mat[3] = g;
    mat[4] = b;  mat[5] = e;  mat[6] = 0;  mat[7] = h;
    mat[8] = 0;  mat[9] = 0;  mat[10] = 1; mat[11] = 0;
    mat[12] = c; mat[13] = f; mat[14] = 0; mat[15] = 1;
  }

  computeQuadToSquare(x0, y0, x1, y1, x2, y2, x3, y3, mat) {
    this.computeSquareToQuad(x0, y0, x1, y1, x2, y2, x3, y3, mat);

    const a = mat[0], d = mat[1], g = mat[3];
    const b = mat[4], e = mat[5], h = mat[7];
    const c = mat[12], f = mat[13];

    const A = e - f * h;
    const B = c * h - b;
    const C = b * f - c * e;
    const D = f * g - d;
    const E = a - c * g;
    const F = c * d - a * f;
    const G = d * h - e * g;
    const H = b * g - a * h;
    const I = a * e - b * d;

    const idet = 1.0 / (a * A + b * D + c * G);

    mat[0] = A * idet;  mat[1] = D * idet;  mat[2] = 0;  mat[3] = G * idet;
    mat[4] = B * idet;  mat[5] = E * idet;  mat[6] = 0;  mat[7] = H * idet;
    mat[8] = 0;          mat[9] = 0;          mat[10] = 1; mat[11] = 0;
    mat[12] = C * idet; mat[13] = F * idet; mat[14] = 0; mat[15] = I * idet;
  }

  getWarpMatrix() {
    return this.warpMat;
  }

  warp(srcX, srcY) {
    if (this.dirty) this.computeWarp();
    return this.warpWithMat(this.warpMat, srcX, srcY);
  }

  warpWithMat(mat, srcX, srcY) {
    const z = 0;
    const rx = srcX * mat[0] + srcY * mat[4] + z * mat[8] + 1 * mat[12];
    const ry = srcX * mat[1] + srcY * mat[5] + z * mat[9] + 1 * mat[13];
    const rw = srcX * mat[3] + srcY * mat[7] + z * mat[11] + 1 * mat[15];
    return { x: rx / rw, y: ry / rw };
  }

  loadWarpMat() {
    const mat = loadWarpMat();
    if (!mat || mat.some((v) => v === undefined || Number.isNaN(v))) return;
    this.warpMat = mat;
    this.dirty = false;
  }

  saveWarpMat() {
    saveWarpMat(this.warpMat);
  }
}
