//音用コードを集めただけ

import ddf.minim.*;
import ddf.minim.analysis.*;
import ddf.minim.effects.*;
import ddf.minim.signals.*;
import ddf.minim.spi.*;
import ddf.minim.ugens.*;

Minim minim;
AudioPlayer hit, gameclear, bgm, coin;

void sound_setup() {
  if (minim == null) {
    minim = new Minim(this);
    hit = minim.loadFile("gabu.mp3", 2048);
    coin = minim.loadFile("coin.mp3", 2048);
    gameclear = minim.loadFile("result.mp3", 2048);
    bgm = minim.loadFile("play.mp3", 2048);
    bgm.setVolume(0.1);
  }
}

void play_hit_sound() {
  hit.rewind();
  hit.play();
}

void play_coin_sound() {
  coin.rewind();
  coin.play();
}

void play_gameclear_sound() {
  gameclear.rewind();
  gameclear.play();
}

void play_bgm() {
  bgm.rewind();
  bgm.loop();
}

void stop_bgm() {
  bgm.pause();
}
