import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';

// 4 samples an octave apart; any note picks the nearest and pitch-shifts via playbackRate (rate and pitch are tied in expo-audio).
const SAMPLES = [
  { midi: 43, source: require('../../assets/audio/note-g2.wav') },
  { midi: 55, source: require('../../assets/audio/note-g3.wav') },
  { midi: 67, source: require('../../assets/audio/note-g4.wav') },
  { midi: 79, source: require('../../assets/audio/note-g5.wav') },
];

// Open-string pitches, chord order (0 = high e — reverse of the fretboard's 0 = low E).
export const CHORD_OPEN_MIDI = [64, 59, 55, 50, 45, 40];

const NOTE_MS = 2000; // sample lifetime before its player is released
const MAX_VOICES = 12;
const STRUM_MS = 26; // gap between strings, so a chord rolls rather than blocks

let voices = [];
let sessionReady = false;
let lastError = null;

export function getPlaybackError() {
  return lastError;
}

async function ensureSession() {
  if (sessionReady) return;
  try {
    await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: false });
    sessionReady = true;
  } catch {
    // playback may still work; don't block on it
  }
}

function release(player) {
  try {
    player.remove();
  } catch {
    // already gone
  }
  voices = voices.filter((v) => v !== player);
}

export function stopAll() {
  voices.slice().forEach(release);
  voices = [];
}

// Plays one MIDI pitch. Fire and forget, so a strum isn't held up by one string.
export function playNote(midi, { volume = 0.9, delayMs = 0 } = {}) {
  const base = SAMPLES.reduce((best, s) =>
    Math.abs(s.midi - midi) < Math.abs(best.midi - midi) ? s : best
  );
  const rate = Math.pow(2, (midi - base.midi) / 12);
  if (rate < 0.5 || rate > 2) return; // out of range the player can shift

  setTimeout(() => {
    let player;
    try {
      player = createAudioPlayer(base.source);
    } catch (err) {
      lastError = `Couldn't create a player: ${err?.message || err}`;
      return;
    }
    voices.push(player);

    // guarded separately so a rejected playbackRate can't silently skip play()
    try {
      player.volume = volume;
    } catch {
      // not settable on this version; full volume is fine
    }
    try {
      // must be false or the player undoes the pitch change
      player.shouldCorrectPitch = false;
    } catch {
      // default is already false
    }
    try {
      if (typeof player.setPlaybackRate === 'function') player.setPlaybackRate(rate);
      else player.playbackRate = rate;
    } catch (err) {
      // worst case: sounds at the sample's own pitch, which beats silence
      lastError = `Pitch shift unavailable: ${err?.message || err}`;
    }
    try {
      player.play();
    } catch (err) {
      lastError = `Playback failed: ${err?.message || err}`;
    }

    setTimeout(() => release(player), NOTE_MS);
    while (voices.length > MAX_VOICES) release(voices[0]);
  }, delayMs);
}

// Strums a shape low to high, with random timing/volume nudges (a perfectly even roll sounds sequenced, not played).
export async function playChordShape(shape) {
  await ensureSession();
  stopAll();
  let step = 0;
  let elapsed = 0;
  // walk backwards (chord order is high e -> low E) to strum low to high
  for (let i = 5; i >= 0; i--) {
    const fret = shape.frets[i];
    if (fret === null || fret === undefined) continue;

    const jitter = (Math.random() - 0.5) * 8; // +/-4ms
    elapsed += step === 0 ? 0 : STRUM_MS + jitter;

    const fade = 1 - step * 0.035; // energy fades slightly across the strum
    const wobble = 1 + (Math.random() - 0.5) * 0.12;
    playNote(CHORD_OPEN_MIDI[i] + fret, {
      delayMs: Math.max(0, elapsed),
      volume: Math.max(0.4, Math.min(1, 0.92 * fade * wobble)),
    });
    step += 1;
  }
}

// Plays a run of pitches in order, e.g. a scale position ascending.
export async function playSequence(midis, { gapMs = 190, volume = 0.9 } = {}) {
  await ensureSession();
  stopAll();
  midis.forEach((midi, i) => {
    const jitter = (Math.random() - 0.5) * 14;
    const wobble = 1 + (Math.random() - 0.5) * 0.14;
    playNote(midi, {
      delayMs: Math.max(0, i * gapMs + (i === 0 ? 0 : jitter)),
      volume: Math.max(0.4, Math.min(1, volume * wobble)),
    });
  });
  return midis.length * gapMs;
}

// Fretboard notes -> ascending pitches, unisons removed.
export function notesToPitches(notes, openMidi) {
  const pitches = notes.map((n) => openMidi[n.string] + n.fret);
  return [...new Set(pitches)].sort((a, b) => a - b);
}
