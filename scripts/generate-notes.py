"""Generates the plucked-string samples FretMate uses for chord and scale playback.

The first version summed harmonics with a simple 1/k rolloff, which is in tune
but sounds like an organ: too pure, too even, too static. What follows adds the
things that actually make a plucked steel string identifiable by ear.

    python3 scripts/generate-notes.py
"""
import math
import os
import struct
import wave

import numpy as np

SR = 44100
SECONDS = 1.8
OUT = os.path.join(os.path.dirname(__file__), "..", "assets", "audio")

# Bases an octave apart. Any note picks the nearest and is pitch-shifted to
# reach its target, so nothing is stretched more than about six semitones.
BASES = [(43, "g2"), (55, "g3"), (67, "g4"), (79, "g5")]


def pluck(freq, seconds=SECONDS, sr=SR):
    n = int(sr * seconds)
    t = np.arange(n) / sr
    out = np.zeros(n)

    # Where along the string it's picked, as a fraction of its length. This is
    # the single strongest timbral cue: picking at 1/5 of the way along nulls
    # the 5th harmonic and every multiple of it, which is why a guitar has a
    # hollow, uneven spectrum rather than a smooth one. Nearer the bridge is a
    # smaller number and a thinner, nasal tone.
    pluck_pos = 0.17

    # Real strings are stiff, so partials sit progressively SHARP of exact
    # multiples of the fundamental rather than landing on them. This is what
    # gives a steel string its slight metallic shimmer; without it the tone
    # sounds synthetic even when everything else is right.
    inharmonicity = 6e-5

    kmax = 40
    for k in range(1, kmax + 1):
        fk = freq * k * math.sqrt(1 + inharmonicity * k * k)
        if fk > sr * 0.45:
            break

        comb = abs(math.sin(math.pi * k * pluck_pos))
        if comb < 1e-3:
            continue

        amp = comb / (k ** 1.05)
        amp *= body_response(fk)

        # Higher partials die away faster — that's why a plucked note is bright
        # at the attack and mellow a moment later.
        decay = 1.5 + 0.85 * (k ** 0.85)

        # A real string vibrates in two planes at once, and they're never quite
        # identical. Summing two slightly detuned copies produces the slow
        # beating and the two-stage decay a single exponential can't.
        for detune, weight, extra_decay in ((1.0, 0.62, 1.0), (1.0009, 0.38, 0.72)):
            phase = (k * 1.7) % (2 * math.pi)
            out += (
                amp
                * weight
                * np.exp(-decay * extra_decay * t)
                * np.sin(2 * math.pi * fk * detune * t + phase)
            )

    out += pick_attack(n, sr)

    attack = int(sr * 0.003)
    out[:attack] *= np.linspace(0, 1, attack)
    fade = int(sr * 0.12)
    out[-fade:] *= np.linspace(1, 0, fade)

    peak = float(np.max(np.abs(out))) or 1.0
    return out / peak * 0.85


def body_response(f):
    """A crude guitar body: the air cavity resonates near 100Hz and the top
    plate near 200Hz, and everything very high rolls off. Without some shaping
    the harmonics come out evenly weighted, which reads as electronic."""
    gain = 1.0
    for centre, width, boost in ((100.0, 45.0, 0.9), (205.0, 80.0, 0.55), (430.0, 200.0, 0.25)):
        gain += boost / (1 + ((f - centre) / width) ** 2)
    gain *= 1.0 / (1 + (f / 3600.0) ** 2)
    return gain


def pick_attack(n, sr):
    """The click of the pick leaving the string. Brief, broadband, and quiet —
    but its absence is why a synthesised note sounds like it starts from
    nowhere."""
    length = int(sr * 0.02)
    rng = np.random.default_rng(11)
    noise = rng.standard_normal(length)
    # crude low-pass so it's a thud rather than a hiss
    for _ in range(3):
        noise = np.convolve(noise, np.ones(4) / 4, mode="same")
    noise *= np.exp(-np.linspace(0, 9, length))
    burst = np.zeros(n)
    burst[:length] = noise
    peak = float(np.max(np.abs(burst))) or 1.0
    return burst / peak * 0.10


def write_wav(path, samples, sr=SR):
    data = np.clip(samples, -1, 1)
    pcm = (data * 32767).astype("<i2").tobytes()
    with wave.open(path, "w") as f:
        f.setnchannels(1)
        f.setsampwidth(2)
        f.setframerate(sr)
        f.writeframes(pcm)


def midi_to_freq(m):
    return 440.0 * (2 ** ((m - 69) / 12))


if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    for midi, name in BASES:
        freq = midi_to_freq(midi)
        path = os.path.join(OUT, f"note-{name}.wav")
        write_wav(path, pluck(freq))
        print(f"note-{name}.wav  midi {midi}  {freq:.2f}Hz  {os.path.getsize(path) // 1024}KB")
