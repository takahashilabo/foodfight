/*****************
 使い方
 （１）Mac１台（scratch、１台はこのプログラムを起動）
 （２）起動後、cを押すと画面が白くなるので、その四隅を左上から時計まわりにクリックする。
 （３）その状態で黒い背景部でクリックするとドットをおいていく。終わったら s を押して保存する。
 （４）1を押すと準備モードになる（本プログラムはドットを表示するだけ、そのドットをみてscratchでプログラムを調整する）。
 （５）scratchの調整が終わったら、scratch側でsを押すと、このプログラムのプレイが開始する。2を押してもこのプログラム単独でプレイを開始できる。これはデバッグ用。
 *****************/

int mode = 0; //画面モード
int timer; //結果画面を表示する時間をカウントする
int score[] = new int [2]; //ゲームスコア

WarperManager wm;
ArrayList<PG> pgl = new ArrayList<PG>();

void setup() {
  fullScreen(2);
  frameRate(30);
  ellipseMode(CENTER);
  rectMode(CENTER);
//  imageMode(CENTER);
  cursor();
  
  PFont font = createFont("BestTenDOT", 48);
  textFont(font);

  wm = new WarperManager("warp.json");

  food_setup();
  sound_setup();
  server_setup();
}

void debug() {
  fill(255);
  text(mode + ":" + wm.isCalibrating(), 0, 20);
}

void draw() {
  switch(mode) {
  case 0: //キャリブレーション（プロジェクタとtoioマットとの対応づけ、ドット配置）
    if (draw_calib()) return;
    background(0, 0, 0);
    draw_food();
    fill(255);
    textSize(18);
    text("キーボードの「c」を押してキャリブしてください（左上から時計回りに四角をクリック）",600, 300);
    text("キャリブが終わったらクリックして食べ物を置きます。最後に「ｓ」を押してください",600, 350);
    text("キーボードの「１」を押してください",600, 400);
    break;

  case 1: //準備画面
    background(0, 0, 0);
    draw_food();
    displayPlayerMaker();
    displayStartPlace();
    isStartReq();

    if (startReq) { //開始要求？
      init_play();
      pgl.clear();
    }
    break;

  case 2: //ゲーム画面
    background(0, 0, 0);
    draw_score();
    draw_food();
    //displayPlayerMaker();
    
    if (newData) { //新フレーム取得　⇒　当たり判定
      collision();
      newData = false;
    }

    draw_PG();
    
//    if (startReq) { //開始要求？
//      init_play();
//    }
    break;

  case 3: //　結果画面
    color c;
    if (score[0] > score[1]) {
      c = color(255, 0, 255);
    } else if (score[0] < score[1]) {
      c = color(0, 255, 0);
    } else {
      c = color(255);
    }
    stroke(c);
    background(0, 0, 0);
    strokeWeight(50);
    noFill();
    beginShape();
    PVector p;
    p = wm.warp(-147, 107); vertex(p.x, p.y);
    p = wm.warp(147, 107); vertex(p.x, p.y);
    p = wm.warp(147, -107); vertex(p.x, p.y);
    p = wm.warp(-147, -107); vertex(p.x, p.y);
    endShape(CLOSE);

    if (random(1) > 0.9) {
      p = wm.warp(random(-147,147),random(-107,107));
      pgl.add(new PG(p.x, p.y, 100, 30, 20, c));
      play_coin_sound();
    }
    
    draw_PG();

    strokeWeight(1);
    fill(255);
    textSize(120);
    p = wm.warp(-110, 0); //画面中央位置（★調整する）
    text("Momo " + score[0] + " - " + score[1] + " Midori", p.x, p.y);
    if (++timer > 300) init_prepare();
    break;
  }

//  debug(); //for debug
}

void draw_PG() {
  for (int i = pgl.size() - 1; i >= 0; i--) {
    PG pg = pgl.get(i);
    if (pg.dead) {
      pgl.remove(i);
    } else {
      pg.draw();
    }
  }
}

void draw_score() {
  fill(255);
  textSize(48);
  PVector p = wm.warp(-45, 80);
  text("Momo " + score[0] + " - " + score[1] + " Midori", p.x, p.y);
}

void init_calib() {
  mode = 0;
  cursor();
  food_init();
  stop_bgm();
}

void init_prepare() {
  mode = 1;
  food_load("food.json");
  noCursor();
  stop_bgm();
}

void init_play() {
  startReq = false;
  mode = 2;
  noCursor();
  score[0] = score[1] = 0;
  play_bgm();
}

void init_result() {
  stop_bgm();
  mode = 3;
  timer = 0;
}

void keyPressed() {
  switch(key) {
  case '0':
    init_calib();
    break;

  case '1':
    init_prepare();
    break;

  case '2':
    init_play();
    pgl.clear();
    break;

  case 'C':
  case 'c':
    init_calib();
    wm.startCalib(); //キャリブレーション（スクリーン座標→toio座標）
    break;
    
  case 'S':
  case 's':
    food_save("food.json"); //キーを押した後だけドット位置を保存する（更新する）
    break;
  }
}

void mousePressed() {
  if (mode > 0) return;

  if (wm.isCalibrating()) {
    wm.setCalibPos(mouseX, mouseY);
  } else {
    food_add(mouseX, mouseY);
  }
}

void collision() {
  PVector t1 = wm.warp(toio_x1, toio_y1);
  PVector t2 = wm.warp(toio_x2, toio_y2);
  for (int i = food.size() - 1; i >= 0; i--) {
    Food f = food.get(i);
    if (dist(f.getPos().x, f.getPos().y, t1.x, t1.y) < 90) { //hit?
      play_hit_sound();
      pgl.add(new PG(f.getPos().x, f.getPos().y, 100, 30, 20, color(255,0,255)));
      food_remove(i);
      score[0] ++;
      if (food.size() == 0) { //gameclear?
        play_gameclear_sound();
        init_result();
      }
    }
    if (dist(f.getPos().x, f.getPos().y, t2.x, t2.y) < 90) { //hit?
      play_hit_sound();
      pgl.add(new PG(f.getPos().x, f.getPos().y, 100, 30, 20, color(0,255,0)));
      food_remove(i);
      score[1] ++;
      if (food.size() == 0) { //gameclear?
        play_gameclear_sound();
        init_result();
      }
    }
  }
}

boolean draw_calib() {
  if (! wm.isCalibrating()) return false;
  background(255);
  wm.drawCalib();
  fill(255, 0, 0);
  text("Calibrating...", 250, 80);
  return true;
}

void displayPlayerMaker() {
  PVector t1 = wm.warp(toio_x1, toio_y1);
  fill(255, 0, 255);
  ellipse(t1.x, t1.y, 30, 30);
  PVector t2 = wm.warp(toio_x2, toio_y2);
  fill(0, 255, 0);
  ellipse(t2.x, t2.y, 30, 30);
}

void isStartReq() { //ゲームスタート？
  PVector t1 = wm.warp(toio_x1, toio_y1);
  PVector t2 = wm.warp(toio_x2, toio_y2);
  PVector p1 = wm.warp(-100, 0);
  PVector p2 = wm.warp(100, 0);
  if (dist(p1.x, p1.y, t1.x, t1.y) < 30 && dist(p2.x, p2.y, t2.x, t2.y) < 30) {
    startReq = true;
  }
}

void displayStartPlace() {
  PVector p1 = wm.warp(100, 0);
  PVector p2 = wm.warp(-100, 0);
  noFill();
  strokeWeight(10);
  stroke(0, 255, 0);
  rect(p1.x, p1.y, 100, 100);
  stroke(255, 0, 255);
  rect(p2.x, p2.y, 100, 100);
}
