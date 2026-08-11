import { useEffect, useRef } from 'react';
import * as Haptics from 'expo-haptics';
import { usePractice, beatIntervalMs } from '../store/usePractice';
import {
  initClickPlayers,
  releaseClickPlayers,
  resetPoolPositions,
  setPlaybackAudioMode,
  fireClick,
} from '../lib/metronomeAudio';

// Runs the metronome scheduler and practice timer. Mounted once at the app root so both keep running across tabs.
export default function usePracticeEngine() {
  const nextTickRef = useRef(0);

  useEffect(() => {
    initClickPlayers();
    return () => releaseClickPlayers();
  }, []);

  // Polls every 10ms and fires when the clock crosses the next beat time.
  // poll() is fully synchronous and advances the schedule BEFORE any audio/
  // haptic work — an earlier awaited version let two polls fire one beat.
  useEffect(() => {
    const POLL_MS = 10;
    let intervalId = null;

    function poll() {
      const state = usePractice.getState();
      if (!state.isPlaying) return;

      const now = Date.now();
      if (now < nextTickRef.current) return;

      const intervalMs = beatIntervalMs(state.bpm);
      const isAccent = state.accentFirst && state.currentBeat === 0;

      // advance the schedule first — nothing below can delay it
      nextTickRef.current += intervalMs;
      // if we fell far behind (app backgrounded), resync instead of catch-up burst
      if (nextTickRef.current < now - intervalMs) {
        nextTickRef.current = now + intervalMs;
      }

      // not awaited — the beat clock already advanced, so this can't shift tempo
      fireClick(isAccent ? 'accent' : 'tick');

      state.advanceBeat();
      if (state.hapticsEnabled) {
        Haptics.impactAsync(
          isAccent ? Haptics.ImpactFeedbackStyle.Heavy : Haptics.ImpactFeedbackStyle.Light
        ).catch(() => {});
      }
    }

    const unsub = usePractice.subscribe((state, prev) => {
      if (state.isPlaying && !prev.isPlaying) {
        // re-assert playback mode (the tuner leaves the session in recording
        // mode) before the first beat, so it can't behave differently from the rest
        resetPoolPositions();
        setPlaybackAudioMode().then(() => {
          // stop may have been hit while the session was switching
          if (!usePractice.getState().isPlaying) return;
          nextTickRef.current = Date.now();
          if (!intervalId) intervalId = setInterval(poll, POLL_MS);
        });
      } else if (!state.isPlaying && prev.isPlaying) {
        if (intervalId) {
          clearInterval(intervalId);
          intervalId = null;
        }
      }
    });

    return () => {
      if (intervalId) clearInterval(intervalId);
      unsub();
    };
  }, []);

  // practice timer: plain 1s ticks while running
  useEffect(() => {
    const id = setInterval(() => {
      const { timerRunning, tickTimer } = usePractice.getState();
      if (timerRunning) tickTimer();
    }, 1000);
    return () => clearInterval(id);
  }, []);
}
