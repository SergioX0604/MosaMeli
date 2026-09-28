/**
 * Genera public/audio/splash-intro.wav: un golpe grave de apertura (dos
 *的时间 capas, tipo "ta-dum") sintetizado, no tomado de ninguna banda sonora.
 *   node scripts/build-splash-audio.js
 */
const fs = require("fs");
const path = require("path");

const SAMPLE_RATE = 22050;
const DURATION = 2.0;
const TOTAL = Math.floor(SAMPLE_RATE * DURATION);
const OUT = path.join("public", "audio", "splash-intro.wav");

const TWO_PI = Math.PI * 2;

/** Onda con barrido descendente y armónicos tipo golpe grave. */
function strike(t, start, length, f0, f1, gain, decay) {
  if (t < start || t > start + length) return 0;
  const local = t - start;
  const progress = local / length;
  // barrido exponencial de la frecuencia
  const freq = f1 + (f0 - f1) * Math.pow(1 - progress, 1.6);
  const phase = TWO_PI * freq * local;
  const body =
    Math.sin(phase) +
    0.55 * Math.sin(phase * 2) +
    0.22 * Math.sin(phase * 3) +
    0.08 * Math.sin(phase * 4.5);
  // ataque muy rapido y caida exponencial
  const attack = Math.min(1, local / 0.006);
  const tail = Math.exp(-local * decay);
  const env = attack * tail * (1 - Math.pow(progress, 6));
  return body * env * gain;
}

function lowpass(input, alpha) {
  let last = 0;
  for (let i = 0; i < input.length; i += 1) {
    last += alpha * (input[i] - last);
    input[i] = last;
  }
  return input;
}

const samples = new Float32Array(TOTAL);

// capa 1: golpe inicial seco
for (let i = 0; i < TOTAL; i += 1) {
  const t = i / SAMPLE_RATE;
  samples[i] += strike(t, 0.0, 0.55, 190, 52, 0.62, 7.5);
}
// capa 2: boom grave largo que sostiene la marca
for (let i = 0; i < TOTAL; i += 1) {
  const t = i / SAMPLE_RATE;
  samples[i] += strike(t, 0.42, 1.5, 92, 38, 0.5, 3.1);
}

// capa de aire: ruido filtrado muy bajo, da cuerpo de "trailer"
const noise = new Float32Array(TOTAL);
let seed = 20260928;
for (let i = 0; i < TOTAL; i += 1) {
  seed = (seed * 1103515245 + 12345) & 0x7fffffff;
  noise[i] = (seed / 0x3fffffff) - 1;
}
lowpass(noise, 0.02);
for (let i = 0; i < TOTAL; i += 1) {
  const t = i / SAMPLE_RATE;
  const env = Math.exp(-t * 5.5) * 0.05;
  samples[i] += noise[i] * env;
}

// normalizar con margen
let peak = 0;
for (let i = 0; i < TOTAL; i += 1) peak = Math.max(peak, Math.abs(samples[i]));
const norm = 0.89 / (peak || 1);

// fade-out final para que no claquee
const fadeStart = TOTAL - Math.floor(SAMPLE_RATE * 0.18);
for (let i = 0; i < TOTAL; i += 1) {
  let value = samples[i] * norm;
  if (i >= fadeStart) value *= 1 - (i - fadeStart) / (TOTAL - fadeStart);
  samples[i] = Math.max(-1, Math.min(1, value));
}

const dataBytes = TOTAL * 2;
const buffer = Buffer.alloc(44 + dataBytes);
buffer.write("RIFF", 0);
buffer.writeUInt32LE(36 + dataBytes, 4);
buffer.write("WAVE", 8);
buffer.write("fmt ", 12);
buffer.writeUInt32LE(16, 16);
buffer.writeUInt16LE(1, 20); // PCM
buffer.writeUInt16LE(1, 22); // mono
buffer.writeUInt32LE(SAMPLE_RATE, 24);
buffer.writeUInt32LE(SAMPLE_RATE * 2, 28);
buffer.writeUInt16LE(2, 32);
buffer.writeUInt16LE(16, 34);
buffer.write("data", 36);
buffer.writeUInt32LE(dataBytes, 40);

for (let i = 0; i < TOTAL; i += 1) {
  buffer.writeInt16LE(Math.round(samples[i] * 32767), 44 + i * 2);
}

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, buffer);
console.log(`${OUT} -> ${TOTAL} muestras, ${(buffer.length / 1024).toFixed(1)} KB`);
