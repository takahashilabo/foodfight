class PG {
  ArrayList<P> pl;
  int num;
  int r;
  boolean dead;
  
  public PG(float x, float y, int num, int r1, int r2, color col) {
    pl = new ArrayList<P>();
    this.num = num;
    this.r = r1;
    for (int i = 0; i < num; i++) {
      float xx = x + r * cos(TWO_PI*i/num);
      float yy = y + r * sin(TWO_PI*i/num);
      pl.add(new P(xx, yy, r2, atan2(yy-y, xx-x), random(10, 20), col)); //5は初速の上限
    }
  }

  void draw() {
    for (int i = pl.size() - 1; i >= 0; i--) {
      P p = pl.get(i);
      p.update();
      if (p.dead) {
        pl.remove(i);
        if (pl.size() == 0) dead = true;
      } else {
        p.draw();
      }
    }
  }

  class P {
    float x, y;
    float r;
    float th;
    float sp;
    boolean dead = false;
    color col;
    
    public P(float x, float y, float r, float th, float sp, color col) {
      this.x = x;
      this.y = y;
      this.r = r;
      this.th = th; //0 - TWO_PI
      this.sp = sp;
      this.col = col;
    }
    
    void update() {
      if (dead) return;
      x += sp * cos(th);
      y += sp * sin(th);
      sp *= 0.9; //0.9を変えると減速速度が速くなる
      if (x < 0 || x > width) dead = true;
      if (y < 0 || y > height) dead = true;
      if (sp < 0.1) dead = true;
    }
    
    void draw() {
      noStroke();
      fill(this.col, sp * 255 * random(0, 1)); //randomは明滅するため
      //      ellipse(x, y, r, r);
      rect(x, y, r, r);
    }
  }
}
