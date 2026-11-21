let ctx = null, master = null;
const opts = { sound: true, volume: 0.6 };
function configureAudio(s) {
  Object.assign(opts, s);
  if (master) master.gain.value = opts.sound ? opts.volume : 0;
}
function unlockAudio() {
  if (!ctx) {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain();
    master.gain.value = opts.sound ? opts.volume : 0;
    master.connect(ctx.destination);
  }
  if (ctx.state !== "running") ctx.resume().catch(() => {
  });
  configureAudio({});
}
const ready = () => ctx && opts.sound && opts.volume > 0;
function tone(freq, start, dur, { type = "sine", gain = 0.2, attack = 5e-3, slide = null } = {}) {
  const t = ctx.currentTime + start;
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + dur);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(gain, t + attack);
  g.gain.exponentialRampToValueAtTime(1e-4, t + dur);
  o.connect(g).connect(master);
  o.start(t);
  o.stop(t + dur + 0.05);
}
function noise(start, dur, { gain = 0.2, freq = 2e3, q = 1, type = "bandpass", sweep = null } = {}) {
  const t = ctx.currentTime + start;
  const buf = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * dur), ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
  src.buffer = buf;
  f.type = type;
  f.frequency.setValueAtTime(freq, t);
  f.Q.value = q;
  if (sweep) f.frequency.exponentialRampToValueAtTime(sweep, t + dur);
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(1e-4, t + dur);
  src.connect(f).connect(g).connect(master);
  src.start(t);
}
const sfx = {
  click() {
    if (ready()) tone(880, 0, 0.06, { type: "square", gain: 0.05, slide: 1320 });
  },
  shake(level = 1) {
    if (ready()) {
      noise(0, 0.18, { gain: 0.08 * level, freq: 300 + level * 200, q: 3 });
      tone(60 + level * 20, 0, 0.2, { type: "triangle", gain: 0.12 });
    }
  },
  tear() {
    if (!ready()) return;
    noise(0, 0.6, { gain: 0.35, freq: 800, sweep: 6e3, q: 0.8 });
    tone(110, 0, 0.6, { type: "sawtooth", gain: 0.12, slide: 40 });
    tone(1600, 0.05, 0.3, { type: "triangle", gain: 0.08, slide: 3200 });
  },
  rip(speed = 0.5) {
    if (ready()) noise(0, 0.035 + Math.random() * 0.03, { gain: 0.05 + 0.2 * speed, freq: 1400 + Math.random() * 2600 + speed * 2e3, q: 1.6 });
  },
  flip() {
    if (ready()) noise(0, 0.08, { gain: 0.15, freq: 3500, q: 2 });
  },
  reveal(tier) {
    if (!ready()) return;
    const scale = [523.25, 659.25, 783.99, 1046.5, 1318.5, 1568, 2093];
    const n = 1 + tier;
    for (let i = 0; i < n; i++) tone(scale[i] / (tier < 2 ? 2 : 1), i * 0.07, 0.35 + tier * 0.08, { type: tier >= 4 ? "sawtooth" : "triangle", gain: 0.06 + tier * 0.012 });
    if (tier >= 3) tone(130.8, 0, 0.8 + tier * 0.1, { type: "sine", gain: 0.15 });
  },
  holo() {
    if (!ready()) return;
    [2093, 2637, 3136, 3951, 4186, 3951, 3136].forEach((f, i) => tone(f, i * 0.05, 0.4, { gain: 0.035 }));
    noise(0, 0.9, { gain: 0.05, freq: 9e3, type: "highpass" });
  },
  place(heavy = false) {
    if (!ready()) return;
    noise(0, 0.09, { gain: 0.22, freq: 1800, q: 0.9 });
    noise(5e-3, 0.16, { gain: heavy ? 0.3 : 0.18, freq: 420, type: "lowpass" });
    tone(heavy ? 95 : 140, 0, heavy ? 0.28 : 0.16, { type: "sine", gain: heavy ? 0.28 : 0.16, slide: heavy ? 42 : 70 });
  },
  draw() {
    if (ready()) {
      noise(0, 0.12, { gain: 0.08, freq: 2400, sweep: 5200, q: 1.4 });
      tone(1320, 0.02, 0.06, { type: "triangle", gain: 0.025 });
    }
  },
  cast() {
    if (!ready()) return;
    noise(0, 0.38, { gain: 0.12, freq: 500, sweep: 4200, q: 1.1 });
    [784, 1175, 1568, 2349].forEach((f, i) => tone(f, 0.12 + i * 0.045, 0.32, { type: "sine", gain: 0.035 }));
  },
  spellHit() {
    if (ready()) {
      noise(0, 0.22, { gain: 0.14, freq: 3e3, sweep: 700, q: 0.8 });
      tone(523, 0, 0.3, { type: "triangle", gain: 0.06, slide: 262 });
    }
  },
  swing() {
    if (ready()) noise(0, 0.14, { gain: 0.1, freq: 900, sweep: 2600, q: 1.6 });
  },
  hit(player = false) {
    if (!ready()) return;
    noise(0, 0.07, { gain: 0.3, freq: 2600, q: 0.7 });
    noise(0, player ? 0.34 : 0.2, { gain: player ? 0.4 : 0.26, freq: player ? 260 : 480, type: "lowpass" });
    tone(player ? 120 : 180, 0, player ? 0.42 : 0.2, { type: "sine", gain: player ? 0.34 : 0.2, slide: player ? 38 : 60 });
  },
  shatter() {
    if (!ready()) return;
    noise(0, 0.05, { gain: 0.32, freq: 4200, q: 0.6 });
    noise(0.03, 0.45, { gain: 0.14, freq: 6500, sweep: 1800, q: 2.5 });
    [2637, 2093, 1760, 1397].forEach((f, i) => tone(f, 0.05 + i * 0.05, 0.18, { type: "triangle", gain: 0.04 }));
    tone(90, 0, 0.3, { type: "sine", gain: 0.18, slide: 40 });
  },
  ability() {
    if (ready()) {
      tone(1046, 0, 0.14, { type: "triangle", gain: 0.06 });
      tone(1568, 0.07, 0.3, { type: "triangle", gain: 0.06 });
      noise(0.02, 0.25, { gain: 0.04, freq: 7e3, type: "highpass" });
    }
  },
  heal() {
    if (ready()) [659, 880, 1109, 1319].forEach((f, i) => tone(f, i * 0.06, 0.38, { type: "sine", gain: 0.05, attack: 0.02 }));
  },
  buff() {
    if (ready()) {
      tone(587, 0, 0.16, { type: "triangle", gain: 0.07 });
      tone(880, 0.08, 0.26, { type: "triangle", gain: 0.07 });
    }
  },
  turn(mine) {
    if (!ready()) return;
    if (mine) {
      tone(784, 0, 0.22, { type: "triangle", gain: 0.08 });
      tone(1175, 0.11, 0.4, { type: "triangle", gain: 0.08 });
    } else {
      tone(392, 0, 0.22, { type: "triangle", gain: 0.06 });
      tone(294, 0.12, 0.36, { type: "triangle", gain: 0.06 });
    }
  },
  apex() {
    if (!ready()) return;
    tone(55, 0, 2.5, { type: "sawtooth", gain: 0.18, attack: 0.3 });
    [261.6, 329.6, 392, 523.3, 659.3, 784, 1046.5].forEach((f, i) => tone(f, 0.4 + i * 0.09, 2.2, { type: "triangle", gain: 0.07, attack: 0.05 }));
    noise(0.3, 2, { gain: 0.12, freq: 400, sweep: 8e3, q: 0.5 });
    [3136, 3951, 4699].forEach((f, i) => tone(f, 1.2 + i * 0.12, 1.2, { gain: 0.03 }));
  }
};
{
  configureAudio,
  sfx,
  unlockAudio
};
