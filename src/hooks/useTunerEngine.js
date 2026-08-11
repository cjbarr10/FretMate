import { useRef, useCallback } from 'react';
import { Platform } from 'react-native';
import {
  useAudioRecorder,
  IOSOutputFormat,
  AudioQuality,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
} from 'expo-audio';
import * as ExpoFileSystem from 'expo-file-system';
import { parseWavBytes } from '../lib/wav';
import { autoCorrelate, freqToNote, rmsOf, smoothPitch, downsampleAverage } from '../lib/pitchDetection';
import { setPlaybackAudioMode } from '../lib/metronomeAudio';
import { useTuner } from '../store/useTuner';
import { useSettings } from '../store/useSettings';

// No continuous mic stream exists in this SDK, so each cycle records a short
// buffer, stops, decodes and analyses it. 200ms stays responsive while turning
// a peg and still lands within ~1 cent even on the low E.
const BUFFER_MS = 200;

// iOS only: the Android recorder offers no raw PCM option, so there are no analysable samples to read.
const IOS_PCM_OPTIONS = {
  extension: '.wav',
  sampleRate: 44100,
  numberOfChannels: 1,
  bitRate: 128000,
  ios: {
    outputFormat: IOSOutputFormat.LINEARPCM,
    audioQuality: AudioQuality.MAX,
    linearPCMBitDepth: 16,
    linearPCMIsBigEndian: false,
    linearPCMIsFloat: false,
  },
  android: {
    outputFormat: 'mpeg4',
    audioEncoder: 'aac',
  },
};

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default function useTunerEngine() {
  // one recorder reused across cycles, re-prepared before each record()
  const audioRecorder = useAudioRecorder(IOS_PCM_OPTIONS);
  const loopActiveRef = useRef(false);
  const historyRef = useRef([]);

  const runLoop = useCallback(async () => {
    while (loopActiveRef.current) {
      try {
        await audioRecorder.prepareToRecordAsync();
        await audioRecorder.record();
        await wait(BUFFER_MS);

        if (!loopActiveRef.current) {
          await audioRecorder.stop().catch(() => {});
          break;
        }

        await audioRecorder.stop();
        const uri = audioRecorder.uri;

        if (!loopActiveRef.current || !uri) continue;

        let bytes;
        try {
          const { File } = ExpoFileSystem;
          if (!File) {
            throw new Error(`No File export. expo-file-system keys: ${Object.keys(ExpoFileSystem).join(', ')}`);
          }
          const file = new File(uri);
          const handle = file.open(); // FileMode isn't exported here; open() reads by default
          try {
            bytes = await handle.readBytes(handle.size);
          } finally {
            try { handle.close(); } catch {}
          }
        } catch (readErr) {
          throw new Error(`File read failed: ${readErr?.message || readErr}`);
        }

        const { samples, sampleRate } = parseWavBytes(bytes);
        const level = rmsOf(samples);
        useTuner.getState().setDebugInfo({ sampleCount: samples.length, sampleRate, rms: level });

        // downsample before the O(n²) autocorrelation — ~16x faster, biggest lever on latency
        const analysisSamples = downsampleAverage(samples, 4);
        const analysisRate = sampleRate / 4;
        const freq = autoCorrelate(analysisSamples, analysisRate);

        if (freq > 0) {
          const { median, next } = smoothPitch(historyRef.current, freq);
          historyRef.current = next;
          const a4 = useSettings.getState().a4;
          useTuner.getState().setReading(median, freqToNote(median, a4));
        } else {
          historyRef.current = []; // signal dropped — don't smooth across a gap
          useTuner.getState().clearReading();
        }
      } catch (err) {
        if (loopActiveRef.current) {
          useTuner.getState().setError(`Tuner error: ${err?.message || String(err)}`);
        }
        break;
      }
    }
  }, [audioRecorder]);

  const start = useCallback(async () => {
    if (Platform.OS !== 'ios') {
      useTuner.getState().setError(
        "Live tuning needs a platform piece that isn't available on Android yet — the audio APIs here only expose compressed formats, not raw microphone data. Works on iOS today."
      );
      return;
    }

    try {
      const { granted } = await requestRecordingPermissionsAsync();
      if (!granted) {
        useTuner.getState().setError('Microphone permission was denied. Enable it in Settings to use the tuner.');
        return;
      }

      await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: true });

      loopActiveRef.current = true;
      historyRef.current = [];
      useTuner.getState().setListening(true);
      runLoop();
    } catch (err) {
      useTuner.getState().setError(`Couldn't start the tuner: ${err?.message || String(err)}`);
    }
  }, [runLoop]);

  const stop = useCallback(async () => {
    loopActiveRef.current = false;
    useTuner.getState().setListening(false);
    useTuner.getState().clearReading();
    try {
      await audioRecorder.stop();
    } catch {
      // already stopped/invalid — fine, nothing to clean up
    }
    // hand the session back to playback mode, or iOS mutes the metronome
    setPlaybackAudioMode();
  }, [audioRecorder]);

  return { start, stop };
}
