class WarperManager 
{
  Warper warper;
  boolean enterCalib = false;
  int calibPosNum;
  PVector[] calib = new PVector[4];
  String paramFileName;
  
  WarperManager(String fileName) {
    paramFileName = fileName;
    warper = new Warper();
    for (int i = 0; i < 4; i++) {
      calib[i] = new PVector(0, 0);
    }
    warper.loadWarpMat(paramFileName);
  }

  boolean isCalibrating() {
    return enterCalib;
  }
  
  void setCalibPos(float x, float y)
  {
    if (!enterCalib) return;

    calib[calibPosNum].x = x;
    calib[calibPosNum].y = y;

    if (++calibPosNum > 3) {
      enterCalib = false;
      calibrate();
      warper.saveWarpMat(paramFileName);
    }
  }
  
  void startCalib() 
  {
    enterCalib = true;
    calibPosNum = 0;
  }
  
  void drawCalib() 
  {
    if (enterCalib) {
      strokeWeight(10);
      stroke(255, 0, 0);
      noFill();
      beginShape();
      for (int i = 0; i < 4; i++) {
        vertex(calib[i].x, calib[i].y);
      }
      endShape(CLOSE);
    }
  }

  PVector warp(float x, float y) 
  {
    return warper.warp(x, y);
  }

  void calibrate() 
  {
    //toio座標変換（シートの４隅の座標）⇒画面座標（シートの４つ端をマウスでクリックした座標）
    warper.setSource(-147,  107,  147, 107,  147, -107,  -147, -107);
    warper.setDestination(calib[0].x, calib[0].y, calib[1].x, calib[1].y, calib[2].x, calib[2].y, calib[3].x, calib[3].y);
//    warper.setSource(0, 0, width, 0, width, height, 0, height);
//    warper.setDestination(calib[0].x, calib[0].y, calib[1].x, calib[1].y, calib[2].x, calib[2].y, calib[3].x, calib[3].y);
//    warper.setSource(calib[0].x, calib[0].y, calib[1].x, calib[1].y, calib[2].x, calib[2].y, calib[3].x, calib[3].y);
//    warper.setDestination(0, 0, width, 0, width, height, 0, height);
    warper.computeWarp();
  }
}
