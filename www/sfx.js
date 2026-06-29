// @ts-check
// sfx.js — Web Audio API 音效合成（零文件依赖）

export function createSFX() {
  let ctx = null;

  function init() {
    if (!ctx) {
      try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch { ctx = null; }
    }
    if (ctx && ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  // 首次用户点击触发 AudioContext
  document.addEventListener('click', init, { once: true });

  function beep(freq, dur, type) {
    const c = init(); if (!c) return;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = type || 'square';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.15, c.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dur);
    osc.connect(gain); gain.connect(c.destination);
    osc.start(); osc.stop(c.currentTime + dur);
  }

  function sweep(f1, f2, dur, type) {
    const c = init(); if (!c) return;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(f1, c.currentTime);
    osc.frequency.exponentialRampToValueAtTime(f2, c.currentTime + dur);
    gain.gain.setValueAtTime(0.15, c.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dur);
    osc.connect(gain); gain.connect(c.destination);
    osc.start(); osc.stop(c.currentTime + dur);
  }

  function arpeggio(freqs, noteDur) {
    const c = init(); if (!c) return;
    freqs.forEach((f, i) => {
      const osc = c.createOscillator();
      const gain = c.createGain();
      const t = c.currentTime + i * noteDur;
      osc.type = 'triangle';
      osc.frequency.value = f;
      gain.gain.setValueAtTime(0.12, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + noteDur);
      osc.connect(gain); gain.connect(c.destination);
      osc.start(t); osc.stop(t + noteDur);
    });
  }

  return {
    init,
    playAttack()  { beep(180, 0.06, 'square'); },
    playCrit()    { beep(440, 0.12, 'sawtooth'); },
    playHeal()    { sweep(300, 600, 0.15, 'sine'); },
    playCatch()   { sweep(400, 900, 0.25, 'triangle'); },
    playDodge()   { sweep(300, 80, 0.1, 'sine'); },
    playDefeat()  { sweep(200, 40, 0.3, 'sawtooth'); },
    playLevelUp() { arpeggio([523, 659, 784, 1047], 0.08); },
    playClick()   { beep(800, 0.03, 'square'); },
  };
}
