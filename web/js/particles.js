// Port of processing/PG.pde: a radial particle-burst effect.
class P {
  constructor(x, y, r, th, sp, col) {
    this.x = x;
    this.y = y;
    this.r = r;
    this.th = th; // 0 - TWO_PI
    this.sp = sp;
    this.col = col;
    this.dead = false;
  }

  update() {
    if (this.dead) return;
    this.x += this.sp * Math.cos(this.th);
    this.y += this.sp * Math.sin(this.th);
    this.sp *= 0.9;
    if (this.x < 0 || this.x > width) this.dead = true;
    if (this.y < 0 || this.y > height) this.dead = true;
    if (this.sp < 0.1) this.dead = true;
  }

  draw() {
    noStroke();
    // p5.js's fill(colorObject, alpha) ignores the alpha argument when the
    // first argument is already a p5.Color (unlike Processing's Java fill()),
    // so the color components must be extracted and passed individually for
    // the flicker (random alpha each frame) to actually take effect.
    fill(red(this.col), green(this.col), blue(this.col), this.sp * 255 * random(0, 1));
    rect(this.x, this.y, this.r, this.r);
  }
}

export class PG {
  constructor(x, y, num, r1, r2, col) {
    this.pl = [];
    this.num = num;
    this.r = r1;
    this.dead = false;
    for (let i = 0; i < num; i++) {
      const xx = x + this.r * Math.cos((TWO_PI * i) / num);
      const yy = y + this.r * Math.sin((TWO_PI * i) / num);
      this.pl.push(new P(xx, yy, r2, Math.atan2(yy - y, xx - x), random(10, 20), col));
    }
  }

  draw() {
    for (let i = this.pl.length - 1; i >= 0; i--) {
      const p = this.pl[i];
      p.update();
      if (p.dead) {
        this.pl.splice(i, 1);
        if (this.pl.length === 0) this.dead = true;
      } else {
        p.draw();
      }
    }
  }
}
