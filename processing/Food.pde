ArrayList<Food> food; //フードの座標
final int FOOD_NUM = 30;
PImage food_img[] = new PImage [FOOD_NUM]; //フード画像は30個に決め打ち
float th = 0;

class Food {
  private PVector pos_;
  private int idx_;
  
  Food(float x, float y) {
    this.pos_ = new PVector(x, y);
    this.idx_ = int(random(FOOD_NUM));
  }
  
  PVector getPos() {
   return this.pos_;
  }
  
  PImage getImage() {
   return food_img[this.idx_];
  }
}

void food_setup() {
  food = new ArrayList<Food>();
  for (int i = 0; i < FOOD_NUM; i++) {
    food_img[i] = loadImage(i + ".gif");
  }
}

void food_init() {
  food.clear();
}

void food_add(float x, float y) {
  food.add(new Food(x, y));
}

void food_remove(int idx) {
  food.remove(idx);
}

void draw_food() {
  noStroke();
  float d = 10 * sin(th);
  for (Food f : food) {
    image(f.getImage(), f.getPos().x - d - 40, f.getPos().y - d - 40, 80 + d*2, 80 + d*2);
  }
  th += 0.1;
}

void food_save(String fileName) {
  JSONObject json = new JSONObject();
  json.setInt("num", food.size());
  for (int i = 0; i < food.size(); i++) {
    Food f = food.get(i);
    json.setFloat("x" + i, f.getPos().x);
    json.setFloat("y" + i, f.getPos().y);
  }
  saveJSONObject(json, fileName);
}

void food_load(String fileName) {
  JSONObject json;
  try {
    json = loadJSONObject(fileName);
  } 
  catch(NullPointerException e) {
    return;
  }

  food.clear();

  int num = json.getInt("num");

  for (int i = 0; i < num; i++) {
    float x = json.getFloat("x" + i);
    float y = json.getFloat("y" + i);
    food.add(new Food(x, y));
  }
}
