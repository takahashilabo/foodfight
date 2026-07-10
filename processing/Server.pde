//scratch側のパソコンで s を押したときに受信して同期してゲームを開始するため

import websockets.*;

WebsocketServer ws;

boolean newData = false;
boolean startReq = false;
float toio_x1 = 0;
float toio_y1 = 0;
float toio_x2 = 0;
float toio_y2 = 0;

void server_setup() {
  ws = new WebsocketServer(this, 8080, "/");
}

void webSocketServerEvent(String msg) {
  //println(msg);
  String[] s = split(msg, ",");
//  if (s[0].equals("0") && s[1].equals("0")) { 
//    startReq = true;
//  } else {
    toio_x1 = float(s[0]);
    toio_y1 = float(s[1]);
    toio_x2 = float(s[2]);
    toio_y2 = float(s[3]);
    newData = true;
//  }
}
