// Soft background music made with code (Web Audio): a slow warm pad over four chords, a few quiet bell notes,
// an echo for space. No sound files. Starts only from a user gesture, can be muted at any time.
const CHORDS = [ // F maj9 · D m9 · B♭ maj7 · C 6/9 (MIDI notes)
  [41, 53, 57, 60, 67], [38, 50, 53, 57, 64], [34, 46, 50, 53, 57], [36, 48, 52, 55, 62],
];
const BELLS = [72, 74, 77, 79, 81, 84];
const hz = (m) => 440 * 2 ** ((m - 69) / 12);

export function createAudio() {
  let ctx = null, master = null, bus = null, timer = null, nextAt = 0, step = 0, on = false, seed = 7;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  function build() {
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return false;
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = 0; master.connect(ctx.destination);
    bus = ctx.createBiquadFilter(); bus.type = 'lowpass'; bus.frequency.value = 1500; bus.Q.value = 0.3; bus.connect(master);
    // echo: two cross-fed delays with damping
    const dA = ctx.createDelay(1.5), dB = ctx.createDelay(1.5), fb = ctx.createGain(), damp = ctx.createBiquadFilter(), wet = ctx.createGain();
    dA.delayTime.value = 0.43; dB.delayTime.value = 0.61; fb.gain.value = 0.42; damp.type = 'lowpass'; damp.frequency.value = 1100; wet.gain.value = 0.5;
    bus.connect(dA); dA.connect(dB); dB.connect(damp); damp.connect(fb); fb.connect(dA); dA.connect(wet); dB.connect(wet); wet.connect(master);
    return true;
  }
  function voice(freq, t, dur, type, peak, detune = 0) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.value = freq; o.detune.value = detune;
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(peak, t + dur * 0.38); g.gain.setValueAtTime(peak, t + dur * 0.55); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(bus); o.start(t); o.stop(t + dur + 0.1);
  }
  function bell(freq, t) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'sine'; o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.05, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 3.2);
    o.connect(g); g.connect(bus); o.start(t); o.stop(t + 3.4);
  }
  const BAR = 8;
  function schedule() {
    while (nextAt < ctx.currentTime + 2.5) {
      const ch = CHORDS[step % CHORDS.length], t = nextAt, dur = BAR * 1.45; // chords overlap into each other
      voice(hz(ch[0]), t, dur, 'sine', 0.11);
      for (let i = 1; i < ch.length; i++) { voice(hz(ch[i]), t + i * 0.12, dur, 'triangle', 0.035, -5); voice(hz(ch[i]), t + i * 0.12, dur, 'sine', 0.03, 6); }
      for (let k = 0; k < 3; k++) if (rnd() < 0.75) bell(hz(BELLS[Math.floor(rnd() * BELLS.length)]), t + 1 + k * 2.4 + rnd() * 1.2);
      nextAt += BAR; step++;
    }
  }
  const api = {
    get on() { return on; }, onChange: null,
    start() {
      if (on) return; if (!ctx && !build()) return;
      on = true; if (ctx.state === 'suspended') ctx.resume();
      nextAt = Math.max(nextAt, ctx.currentTime + 0.1);
      master.gain.cancelScheduledValues(ctx.currentTime); master.gain.setTargetAtTime(0.5, ctx.currentTime, 0.8);
      schedule(); timer = setInterval(schedule, 800);
      api.onChange && api.onChange(true);
    },
    stop() {
      if (!on) return; on = false; clearInterval(timer);
      master.gain.cancelScheduledValues(ctx.currentTime); master.gain.setTargetAtTime(0, ctx.currentTime, 0.25);
      api.onChange && api.onChange(false);
    },
    toggle() { if (on) api.stop(); else api.start(); },
  };
  return api;
}
