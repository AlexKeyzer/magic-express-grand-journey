/* Magic Express — WebAudio: 7 SFX + region music loop, respects mute/volume */
(function () {
  'use strict';
  var ctx = null, master = null, musicGain = null, sfxGain = null;
  var muted = false, musicOn = true, curRegion = 1, loopTimer = null, step = 0, suspended = false, intensity = 0, intensityT = null;

  function ensure() {
    if (ctx) return true;
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      master = ctx.createGain(); master.gain.value = muted ? 0 : 0.9; master.connect(ctx.destination);
      sfxGain = ctx.createGain(); sfxGain.gain.value = 0.9; sfxGain.connect(master);
      musicGain = ctx.createGain(); musicGain.gain.value = 0.35; musicGain.connect(master);
    } catch (e) { ctx = null; return false; }
    return true;
  }
  function unlock() { if (ensure() && ctx.state === 'suspended') ctx.resume(); if (musicOn && !loopTimer && !suspended) startLoop(); }

  function env(g, t0, a, d, peak) {
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(peak, t0 + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + a + d);
  }
  function tone(freq, t0, dur, type, peak, dest, slideTo) {
    if (!ctx) return;
    var o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type || 'sine'; o.frequency.setValueAtTime(freq, t0);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    env(g, t0, 0.008, dur, peak == null ? 0.5 : peak);
    o.connect(g); g.connect(dest || sfxGain);
    o.start(t0); o.stop(t0 + dur + 0.1);
  }
  function noise(t0, dur, peak, dest, freq) {
    if (!ctx) return;
    var len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    var buf = ctx.createBuffer(1, len, ctx.sampleRate);
    var d = buf.getChannelData(0);
    for (var i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    var src = ctx.createBufferSource(); src.buffer = buf;
    var f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq || 1200;
    var g = ctx.createGain(); g.gain.value = peak == null ? 0.4 : peak;
    src.connect(f); f.connect(g); g.connect(dest || sfxGain);
    src.start(t0);
  }

  var SFX = {
    swipe: function () { if (!ensure()) return; var t = ctx.currentTime; noise(t, 0.12, 0.35, sfxGain, 900); },
    match: function (cascade) {
      if (!ensure()) return; var t = ctx.currentTime;
      var base = 440 * Math.pow(1.06, Math.min(10, cascade || 1));
      tone(base, t, 0.16, 'triangle', 0.5); tone(base * 1.5, t + 0.04, 0.14, 'triangle', 0.35);
    },
    cascade: function (n) {
      if (!ensure()) return; var t = ctx.currentTime;
      for (var i = 0; i < Math.min(5, n); i++) tone(520 * Math.pow(1.12, i), t + i * 0.06, 0.12, 'square', 0.18);
    },
    whistle: function () {
      if (!ensure()) return; var t = ctx.currentTime;
      tone(392, t, 0.7, 'sawtooth', 0.28); tone(494, t, 0.7, 'sawtooth', 0.24);
      tone(392 * 2, t + 0.02, 0.6, 'sine', 0.16); noise(t, 0.5, 0.12, sfxGain, 2400);
    },
    boss: function () {
      if (!ensure()) return; var t = ctx.currentTime;
      tone(98, t, 0.5, 'sawtooth', 0.5); tone(74, t + 0.18, 0.6, 'sawtooth', 0.45);
      noise(t, 0.3, 0.3, sfxGain, 300);
    },
    chest: function () {
      if (!ensure()) return; var t = ctx.currentTime;
      [660, 880, 1100, 1320].forEach(function (f, i) { tone(f, t + i * 0.07, 0.18, 'triangle', 0.3); });
    },
    win: function () {
      if (!ensure()) return; var t = ctx.currentTime;
      [523, 659, 784, 1046].forEach(function (f, i) { tone(f, t + i * 0.12, 0.3, 'triangle', 0.4); });
      tone(1568, t + 0.5, 0.5, 'sine', 0.25);
    },
    fail: function () { if (!ensure()) return; var t = ctx.currentTime; tone(220, t, 0.4, 'sawtooth', 0.3, sfxGain, 110); },
    coin: function () { if (!ensure()) return; var t = ctx.currentTime; tone(1320, t, 0.09, 'square', 0.2); tone(1760, t + 0.07, 0.12, 'square', 0.18); },
    tap: function () { if (!ensure()) return; tone(700, ctx.currentTime, 0.05, 'sine', 0.2); }
  };

  /* region music: simple looped arpeggio patterns, scale/tempo per region */
  var SCALES = {
    1: [0, 2, 4, 7, 9], 2: [0, 2, 3, 7, 8], 3: [0, 2, 4, 6, 9], 4: [0, 3, 5, 7, 10],
    5: [0, 2, 4, 7, 8], 6: [0, 2, 4, 7, 11], 7: [0, 2, 4, 5, 9], 8: [0, 1, 4, 7, 8]
  };
  var TEMPO = { 1: 0.34, 2: 0.38, 3: 0.4, 4: 0.36, 5: 0.34, 6: 0.46, 7: 0.3, 8: 0.32 };
  var ROOT = { 1: 220, 2: 196, 3: 246.9, 4: 174.6, 5: 220, 6: 164.8, 7: 261.6, 8: 185 };

  function loopStep() {
    if (!ctx || muted || !musicOn || suspended) return;
    var sc = SCALES[curRegion] || SCALES[1];
    var root = ROOT[curRegion] || 220;
    var t = ctx.currentTime + 0.02;
    var deg = sc[step % sc.length];
    var oct = (step % 8 < 4) ? 1 : 2;
    var f = root * Math.pow(2, deg / 12) * oct;
    tone(f, t, 0.22, 'triangle', 0.32, musicGain);
    if (step % 4 === 0) tone(root / 2, t, 0.5, 'sine', 0.4, musicGain);
    if (step % 8 === 4) tone(root * 0.749, t, 0.45, 'sine', 0.28, musicGain);
    if (step % 2 === 1) noise(t, 0.04, 0.07, musicGain, 6500 + (curRegion % 3) * 900);   /* hat */
    if (step % 8 === 0) {   /* warm pad */
      tone(root * 1.498, t, 1.2, 'triangle', 0.10, musicGain);
      tone(root * 1.888, t, 1.2, 'triangle', 0.08, musicGain);
    }
    if (intensity > 0) {   /* cascade excitement layer */
      tone(f * 2, t + 0.02, 0.1, 'square', 0.10, musicGain);
      if (step % 2 === 0) tone(root * 2, t, 0.14, 'triangle', 0.14, musicGain);
    }
    step++;
    loopTimer = setTimeout(loopStep, (TEMPO[curRegion] || 0.36) * 1000);
  }
  function startLoop(region) {
    curRegion = region || curRegion;
    stopLoop();
    if (!ensure()) return;
    loopTimer = setTimeout(loopStep, 60);
  }
  function stopLoop() { if (loopTimer) { clearTimeout(loopTimer); loopTimer = null; } }

  window.MEaudio = {
    unlock: unlock,
    sfx: SFX,
    setMuted: function (m) { muted = !!m; if (master) master.gain.value = muted ? 0 : 0.9; },
    isMuted: function () { return muted; },
    setMusic: function (on) { musicOn = !!on; if (!musicOn) stopLoop(); else startLoop(); },
    musicOn: function () { return musicOn; },
    setRegion: function (r) {
      if (r === curRegion) return;
      if (!ctx || !loopTimer || !musicOn) { curRegion = r; if (loopTimer) startLoop(r); return; }
      musicGain.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.08);   /* fade out */
      setTimeout(function () {
        curRegion = r; step = 0;
        if (ctx && musicOn && !suspended) {
          noise(ctx.currentTime, 0.3, 0.12, musicGain, 1800);          /* whoosh transition */
          musicGain.gain.setTargetAtTime(0.35, ctx.currentTime, 0.12); /* fade in new theme */
        }
      }, 180);
    },
    kick: function (ms) {
      intensity = 1;
      if (intensityT) clearTimeout(intensityT);
      intensityT = setTimeout(function () { intensity = 0; }, ms || 2000);
    },
    suspend: function () { suspended = true; stopLoop(); if (ctx) { try { ctx.suspend(); } catch (e) {} } },
    resume: function () { suspended = false; if (ctx) { try { ctx.resume(); } catch (e) {} } if (musicOn) startLoop(); }
  };
})();
