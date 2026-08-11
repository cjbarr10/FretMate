import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';

const tickSource = require('../../assets/audio/tick.wav');
const accentSource = require('../../assets/audio/accent.wav');

const SOURCES = { accent: accentSource, tick: tickSource };

// Every click gets its own single-use player (an earlier pooled/rewound
// version broke across an expo-audio update and went silent after 1 beat).
const CLEANUP_MS = 600; // comfortably past the ~100ms click
const MAX_LIVE = 8; // cap against runaway allocation

let live = [];
let audioError = null;
let failures = 0;

export function getAudioError() {
  return audioError;
}

export function getFailureCount() {
  return failures;
}

// Switches the audio session to playback mode (the tuner leaves it in recording mode, which mutes playback on iOS).
export async function setPlaybackAudioMode() {
  try {
    await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: false });
    return true;
  } catch (err) {
    audioError = `Audio mode failed: ${err?.message || String(err)}`;
    return false;
  }
}

export function initClickPlayers() {
  setPlaybackAudioMode();
  audioError = null;
  failures = 0;
}

export function releaseClickPlayers() {
  live.forEach((p) => {
    try {
      p.remove();
    } catch {
      // already gone
    }
  });
  live = [];
}

// kept for the engine's call site; nothing to reset with single-use players
export function resetPoolPositions() {
  failures = 0;
}

// kind: 'accent' (first beat of the measure) | 'tick' (the others)

export function fireClick(kind = 'tick') {
  const source = SOURCES[kind] || tickSource;
  try {
    const player = createAudioPlayer(source);
    player.volume = 1.0;
    player.play();
    live.push(player);

    setTimeout(() => {
      try {
        player.remove();
      } catch {
        // engine unmounted, or already released
      }
      live = live.filter((p) => p !== player);
    }, CLEANUP_MS);

    while (live.length > MAX_LIVE) {
      const oldest = live.shift();
      try {
        oldest.remove();
      } catch {
        // already gone
      }
    }
    return true;
  } catch (err) {
    failures += 1;
    audioError = `Click playback failed: ${err?.message || String(err)}`;
    return false;
  }
}
