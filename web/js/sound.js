// Port of processing/Sound.pde, using p5.sound.
let hit, coin, gameclear, bgm;

export function soundPreload() {
  hit = loadSound('assets/audio/gabu.mp3');
  coin = loadSound('assets/audio/coin.mp3');
  gameclear = loadSound('assets/audio/result.mp3');
  bgm = loadSound('assets/audio/play.mp3');
}

export function soundSetup() {
  bgm.setVolume(0.1);
}

// Call from an existing user-gesture handler (e.g. the "connect cube" /
// "fullscreen" button) so autoplay policy doesn't silently swallow later
// sound.play() calls.
export function unlockAudio() {
  userStartAudio();
}

export function playHitSound() {
  hit.stop();
  hit.play();
}

export function playCoinSound() {
  coin.stop();
  coin.play();
}

export function playGameClearSound() {
  gameclear.stop();
  gameclear.play();
}

export function playBgm() {
  bgm.stop();
  bgm.loop();
}

export function stopBgm() {
  bgm.pause();
}
