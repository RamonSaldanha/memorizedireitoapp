// Grava em assets/audio os sons da web (resources/js/lib/sounds.ts do site) exatamente como a
// Web Audio API os gera: senoides com a mesma envoltória exponencial (0,0001 -> volume em 20 ms
// -> 0,0001 no fim da nota) e o mesmo volume, sem ganho extra. Comparado com um
// OfflineAudioContext do Chrome em 19/11/2026: a diferença fica abaixo de -100 dB.
//
// Mudou um som na web? Ajuste as notas aqui e rode `npm run sounds`.
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const RATE = 44100;
const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'assets', 'audio');

function chime(notes, { gap = 0.11, length = 0.32, volume = 0.14 } = {}) {
  const total = (notes.length - 1) * gap + length + 0.05;
  const buf = new Float64Array(Math.ceil(total * RATE));
  notes.forEach((frequency, index) => {
    const start = index * gap;
    const first = Math.ceil(start * RATE);
    const last = Math.min(buf.length, Math.floor((start + length + 0.05) * RATE));
    for (let i = first; i < last; i++) {
      const t = i / RATE - start;
      const gain =
        t < 0.02
          ? 0.0001 * (volume / 0.0001) ** (t / 0.02)
          : t < length
            ? volume * (0.0001 / volume) ** ((t - 0.02) / (length - 0.02))
            : 0.0001; // a Web Audio segura o último valor até parar o oscilador
      buf[i] += gain * Math.sin(2 * Math.PI * frequency * t);
    }
  });
  return buf;
}

/** WAV mono, 16 bits. */
function wav(samples) {
  const data = Buffer.alloc(samples.length * 2);
  samples.forEach((x, i) => data.writeInt16LE(Math.max(-32767, Math.min(32767, Math.round(x * 32767))), i * 2));
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + data.length, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(1, 22); // mono
  header.writeUInt32LE(RATE, 24);
  header.writeUInt32LE(RATE * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36);
  header.writeUInt32LE(data.length, 40);
  return Buffer.concat([header, data]);
}

// Acerto: duas notas subindo (sol e dó) — playCorrect()
writeFileSync(join(OUT, 'correct.wav'), wav(chime([783.99, 1046.5])));
// Fim de fase: um arpejo curto de dó maior — playPhaseComplete()
writeFileSync(join(OUT, 'phase-complete.wav'), wav(chime([523.25, 659.25, 783.99, 1046.5], { gap: 0.12, length: 0.45, volume: 0.13 })));

console.log('assets/audio/correct.wav e assets/audio/phase-complete.wav gravados');
