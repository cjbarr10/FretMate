import { base64ToBytes } from './base64';

// Parses a 16-bit PCM WAV into normalized mono samples, walking the RIFF chunk list (not a fixed 44-byte header).
export function parseWavBytes(bytes) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

  if (bytes.length < 12) throw new Error('File too short to be a WAV');
  const riff = String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3]);
  const wave = String.fromCharCode(bytes[8], bytes[9], bytes[10], bytes[11]);
  if (riff !== 'RIFF' || wave !== 'WAVE') throw new Error('Not a RIFF/WAVE file');

  let offset = 12;
  let sampleRate = 44100;
  let numChannels = 1;
  let bitsPerSample = 16;
  let dataOffset = -1;
  let dataSize = 0;

  while (offset + 8 <= bytes.length) {
    const id = String.fromCharCode(bytes[offset], bytes[offset + 1], bytes[offset + 2], bytes[offset + 3]);
    const size = view.getUint32(offset + 4, true);
    const body = offset + 8;

    if (id === 'fmt ') {
      numChannels = view.getUint16(body + 2, true);
      sampleRate = view.getUint32(body + 4, true);
      bitsPerSample = view.getUint16(body + 14, true);
    } else if (id === 'data') {
      dataOffset = body;
      dataSize = size;
    }

    offset = body + size + (size % 2); // chunks are word-aligned
    if (id === 'data') break;
  }

  if (dataOffset < 0) throw new Error('No data chunk found in WAV');
  if (bitsPerSample !== 16) throw new Error(`Unsupported bit depth: ${bitsPerSample}`);

  const bytesPerFrame = (bitsPerSample / 8) * numChannels;
  const frameCount = Math.floor(dataSize / bytesPerFrame);
  const samples = new Float32Array(frameCount);

  for (let i = 0; i < frameCount; i++) {
    const frameStart = dataOffset + i * bytesPerFrame;
    if (numChannels === 1) {
      samples[i] = view.getInt16(frameStart, true) / 32768;
    } else {
      // downmix to mono by averaging channels
      let sum = 0;
      for (let ch = 0; ch < numChannels; ch++) {
        sum += view.getInt16(frameStart + ch * 2, true);
      }
      samples[i] = sum / numChannels / 32768;
    }
  }

  return { samples, sampleRate };
}

// Convenience wrapper for base64-encoded WAV data (kept for tests/reuse).
export function parseWavBase64(base64) {
  return parseWavBytes(base64ToBytes(base64));
}
