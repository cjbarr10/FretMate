# FretMate — How It Works

A complete walkthrough of the app: what it does, how it's put together, what
every file is for, and how the tricky parts actually work.

Written to be read start to finish. If you only want one section, the
**Concepts** part explains the music theory and audio ideas the rest depends
on, and **File by file** is the reference.

---

## Contents

1. [What the app is](#1-what-the-app-is)
2. [Concepts you need first](#2-concepts-you-need-first)
3. [The tech stack, and why](#3-the-tech-stack-and-why)
4. [How the app is layered](#4-how-the-app-is-layered)
5. [File by file](#5-file-by-file)
6. [The four hard problems](#6-the-four-hard-problems)
7. [How it was built, in order](#7-how-it-was-built-in-order)
8. [Testing](#8-testing)
9. [Known limits](#9-known-limits)
10. [Glossary](#10-glossary)

---

## 1. What the app is

FretMate is a guitar reference tool — five tabs, no lessons or gamification.
You open it mid-practice, check something, and put it down.

| Tab | What it does |
|---|---|
| **Chords** | 15 chord qualities in all 5 CAGED forms, plus 3-string triads in 3 inversions. Fingering chart, neck diagram, and a strum button. |
| **Scales** | 8 scales in 12 keys, whole neck or one of 5 positions, playable as a run. Below it, the chords that belong to the key. |
| **Tuner** | Chromatic tuner listening through the microphone. Needle dial, cents display, per-string targets. |
| **Metronome** | 40–240 BPM, tap tempo, accented downbeat, practice timer. Runs across tabs. |
| **Settings** | Tuning, fret count, dark/light theme. |

Everything persists — close the app and your theme, tuning, tempo, and last
scale are still there.

---

## 2. Concepts you need first

These five ideas explain most of the code. Nothing later makes sense without
them.

### Pitch class

A note name without an octave. There are 12: C=0, C#=1, D=2 … B=11. Every C is
pitch class 0, whatever octave it's in.

The app uses pitch classes constantly because *which* C doesn't usually matter
— what matters is that it's a C. `mod12(n)` wraps any number into 0–11, so
"three semitones above B (11)" is `mod12(11 + 3)` = 2 = D.

### MIDI note number

A note name *with* an octave, as a single number. Middle C is 60, A440 is 69.
Each step of 1 is one semitone.

Where pitch class answers "what note?", MIDI answers "which exact pitch?" The
app needs both: pitch classes for "is this note in the scale?", MIDI for "is
this note higher than that one?"

Converting is easy: `pitchClass = midi % 12`.

### Intervals, and why the guitar is awkward

An interval is the distance between two notes in semitones. A major third is
4, a perfect fifth is 7.

The six guitar strings are tuned in fourths — 5 semitones apart — **except**
between the G and B strings, which are a major third (4) apart:

```
E ──5── A ──5── D ──5── G ──4── B ──5── e
```

That single irregularity is responsible for a surprising amount of this
codebase. Chord shapes bend around it, scale positions shift a fret on the B
string because of it, and two real bugs in this app came from forgetting it.

### Cents

A cent is 1/100th of a semitone — the unit tuners use because it's fine enough
to be meaningful. Roughly 5 cents off is "in tune"; 20 cents is audibly wrong.

Because pitch is logarithmic, the formula is:

```
cents = 1200 × log₂(frequency ÷ targetFrequency)
```

### The CAGED system

Five open chord shapes — C, A, G, E, D — can each slide up the neck if you use
a finger where the nut was. That gives five ways to play any chord, and five
scale positions that sit around them.

The name is the order they appear going up the neck: from a C chord you meet
C-form, then A-form, then G, E, D, then C again an octave up. The app
reproduces this without being told to — `getChordShapes(C, 'major')` returns
them sorted by fret and they come out C-A-G-E-D, which was a good sign the
placement maths was right.

---

## 3. The tech stack, and why

| Choice | Why |
|---|---|
| **React Native + Expo** | One codebase for iOS and Android, and Expo Go means testing on a real phone without Xcode or Android Studio. |
| **Expo Router** | File-based navigation: a file at `app/(tabs)/chords.jsx` *is* the Chords route. No route config to maintain. |
| **Zustand** | State store. Much less ceremony than Redux, and it can be read outside React (`useStore.getState()`) — which the metronome engine needs, since it runs on a timer, not in a render. |
| **AsyncStorage + zustand/persist** | Saves preferences between launches. |
| **Jest** | Tests the music engines. |
| **Plain JavaScript** | Chosen deliberately over TypeScript to keep the setup small. Types would have caught at least one bug here (the string-numbering flip), which is worth being honest about. |

---

## 4. How the app is layered

The most important structural decision: **all the music theory is pure
JavaScript with no React in it.**

```
   screens        app/(tabs)/*.jsx        what you see and tap
      │
   components     src/components/         reusable UI pieces
      │
   hooks          src/hooks/              things that run over time
      │
   stores         src/store/              app state, persisted
      │
   lib            src/lib/                pure logic — no React, no UI
```

Each layer only knows about the ones below it. `src/lib` doesn't import React,
doesn't know a screen exists, and doesn't touch storage. That's why:

- it can be unit tested directly in Node, with no simulator
- the whole UI could be replaced without touching the music theory
- a failing test points at a function, not at a screen

If you take one thing from this document for an interview, take that.

---

## 5. File by file

### `src/lib` — pure logic

#### `notes.js` (81 lines)
The vocabulary everything else speaks.

- `NOTE_NAMES` — the 12 pitch class names.
- `mod12(n)` — wraps any integer into 0–11. Handles negatives correctly, which
  plain `%` does not (`-1 % 12` is `-1` in JavaScript, not `11`).
- `TUNINGS` — standard, drop D, open G. Each carries `offsets` (open-string
  pitch classes) **and** `openMidi` (absolute pitches). Both are needed: pitch
  classes answer "is this note in the scale?", MIDI answers "is this note
  higher than that one?", and box shapes need the second.
- `midiToFreq(midi, a4)` — pitch to frequency, used by the tuner.
- `noteOctaveToFreq('E2')` — the target frequency for a given string.

#### `scaleEngine.js` (218 lines)
Which notes light up on the fretboard.

- `SCALES` — 8 scale definitions. Each is just a list of intervals from the
  root: major is `[0,2,4,5,7,9,11]`.
- `getScaleNotes(root, scale, tuning, maxFret)` — walks all 6 strings × all
  frets, and includes a fret if its interval from the root is in the scale.
  Simple, and correct in all 12 keys *by construction* — there's no per-key
  data that could be wrong.
- `boxOffsets(...)` — works out a position's shape once, at a reference point
  in the middle of the neck, then caches it. See §6.1 for why the location
  matters.
- `getPositionRanges(...)` — returns a fret range **per string**, not one
  shared window. This is the B-string irregularity showing up again.
- `getScaleNotesInPosition(...)` — all the scale notes, filtered to those
  ranges.

#### `chordEngine.js` (298 lines)
Chord shapes.

- `CHORD_TYPES` — 15 qualities, each defined by its intervals. Major is
  `[0,4,7]` (root, major third, fifth).
- `FORMS` — the five CAGED forms. Each stores fret offsets from the barre, plus
  which string the root sits on and how far above the barre it is. Those two
  facts let one table serve all 12 keys.
- `getChordShapes(root, type)` — builds every available voicing and sorts them
  up the neck.
- `getTriadShapes(root, type, stringSet)` — three-note voicings, computed
  rather than tabled. See §6.2.
- `toFretboardNotes(shape)` — **the string-numbering flip.** Chord charts count
  strings 0 = high e; the fretboard counts 0 = low E. Crossing between the two
  requires reversing, and forgetting to was a real bug.

#### `harmony.js` (82 lines)
The chords that belong to a key.

`getDiatonicChords(root, scale, useSevenths)` takes each scale degree, skips a
note, skips another — stacking thirds *through the scale* — and names whatever
interval pattern falls out. Nothing is hardcoded per key.

That's why harmonic minor comes out right: `i ii° III+ iv V VI vii°`, with a
**major** V chord. That major V is the entire reason harmonic minor exists, and
a lookup-table implementation usually gets it wrong.

#### `pitchDetection.js` (135 lines)
Turning microphone audio into a note name. Explained fully in §6.3.

- `autoCorrelate(buffer, sampleRate)` → frequency in Hz, or −1.
- `downsampleAverage(buffer, 4)` → the performance fix.
- `freqToNote(freq)` → `{ name: 'A', octave: 4, cents: 0 }`.
- `matchToTuning(freq, targets)` → which string you're tuning.
- `smoothPitch(history, freq)` → octave-error correction plus a median.

#### `notePlayer.js` (141 lines)
Playing chords and scales. See §6.4.

- `playNote(midi)` — picks the nearest sample and pitch-shifts it.
- `playChordShape(shape)` — strums low string to high.
- `playSequence(midis)` — plays a run of notes.

#### `metronomeAudio.js` (91 lines)
The click sounds. Each click gets a brand-new player that's used once and
discarded — an earlier version reused a pool and had to rewind each player,
which broke and produced a metronome that played one beat then went silent.

#### `tempo.js` (7 lines)
`beatIntervalMs(bpm)` = `60000 / bpm`. Tiny, but kept out of the store on
purpose: the store imports AsyncStorage, and a test that only wants tempo maths
shouldn't have to drag storage into Node.

#### `wav.js` / `base64.js` (64 / 28 lines)
Decoding recorded audio. `wav.js` walks the RIFF chunk list rather than
assuming a fixed 44-byte header, because encoders insert extra chunks.
`base64.js` is a hand-written decoder because React Native's JavaScript engine
has no `atob`.

### `src/store` — application state

Zustand stores. Each holds state plus the functions that change it.

| File | Holds | Persisted? |
|---|---|---|
| `useSettings.js` | tuning, fret count, theme | yes |
| `useFretboard.js` | scale root, scale type, position | yes |
| `useChords.js` | chord root, type, view mode, voicing | yes |
| `usePractice.js` | BPM, time signature, timer | settings only |
| `useTuner.js` | live frequency, note, errors | no |
| `persist.js` | the shared storage adapter | — |

**What isn't saved matters as much as what is.** The metronome's play state and
the timer's elapsed seconds are deliberately excluded — restoring them would
mean opening the app to a metronome already clicking and a stopwatch counting
practice you never did. The tuner saves nothing at all; a stale reading from
yesterday is worse than none.

### `src/hooks` — things that run over time

#### `usePracticeEngine.js` (89 lines)
The metronome. Mounted once at the app root, not inside a tab, which is why the
beat keeps going when you switch screens.

It polls every 10ms and fires when the current time passes the next scheduled
beat. Two rules keep it steady, both learned from bugs:

1. **The function is synchronous.** An earlier version awaited an audio call
   before recording that the beat had happened, so a second poll saw a stale
   time and fired the same beat again. Simulated over 60 seconds at 120 BPM,
   that produced **260 beats instead of 120**.
2. **The schedule advances from the previous scheduled time**, never from
   "now", so a late beat can't push everything after it later too.

#### `useTunerEngine.js` (152 lines)
Record ~200ms → stop → read the file → decode → analyse → repeat. Not a
continuous stream, because this SDK doesn't expose one.

#### `useHydrated.js` (32 lines)
Storage reads are asynchronous, so on the very first frame every store still
holds its defaults. Without this gate, someone using light mode sees a flash of
dark first. It waits for all four stores, with a 1.5-second bail-out so a
storage problem can't leave a blank screen.

### `src/components` — reusable UI

- **`Fretboard.jsx` (207)** — draws the neck. Horizontally scrollable, string
  thickness varies, inlay dots at the right frets, notes as coloured circles.
- **`ChordDiagram.jsx` (160)** — a vertical chord chart. Nut, strings, dots,
  ✕/○ markers, barre bar, and a "8fr" label when the shape sits up the neck.
- **`Button3D.jsx` (67)** — the button with a thick bottom border that
  collapses when pressed.
- **`Chip.jsx` (48)** — the selectable pills.
- **`PracticeWidget.jsx` (115)** — the floating metronome/timer bar that
  appears on other tabs while something is running.

### `src/theme`

`tokens.js` holds two palettes — dark and light — with identical key names.
`useTheme()` returns whichever is active.

**Why a hook and not an import:** `StyleSheet.create` bakes its values in when
the module first loads. A palette imported directly could never change at
runtime. Reading it through the store means changing the theme re-renders every
screen. This is why each component builds its styles inside `useMemo` rather
than at the top of the file.

### `app/` — screens

Expo Router: the file path is the route.

- **`_layout.jsx`** — wraps everything. Starts the metronome engine, holds the
  hydration gate, sets the status bar.
- **`(tabs)/_layout.jsx`** — the five-tab bar.
- **`(tabs)/chords.jsx` (214)**, **`scales.jsx` (307)**, **`tuner.jsx` (285)**,
  **`metronome.jsx` (227)**, **`settings.jsx` (99)** — the screens.
- **`(tabs)/index.jsx` (7)** — a redirect. Expo Router needs a route for the
  group's root path; it just forwards to Scales.

### `scripts/`

- **`generate-notes.py`** — synthesises the guitar samples (§6.4).
- **`generate-icons.py`** — draws the app icon in three concepts.

Both are in the repo so the assets are reproducible rather than mystery binaries.

---

## 6. The four hard problems

### 6.1 Scale positions

A "position" is one of five shapes you play a scale in. The naive
implementation is a fret window — show every scale note between fret 5 and 8.
That's what the first version did, and it was wrong twice.

**What a position actually is:** twelve consecutive scale notes, ascending, two
per string, anchored to a pentatonic box. Seven-note scales sit on top of that
five-note skeleton with one fret of reach either side, because their two extra
degrees fall outside it.

Two bugs came out of this, both found by checking the app against a real
fretboard:

**Bug 1 — the B string.** A uniform window clips notes, because the B string is
a major third above the G, not a fourth, so its notes sit a fret higher than
the rest of the pattern. Fix: per-string ranges.

**Bug 2 — the nut.** Building a shape at a root on fret 0 can produce a
negative fret, because a note in the run can be lower than the next string's
open pitch. Fix: work the shape out once at fret 12, then transpose it.

### 6.2 Triads

576 voicings — 4 string sets × 3 inversions × 4 qualities × 12 keys — from one
rule: put the bass note down, then each higher string takes the next chord tone
*above* the note below it. That "next one up" rule is what makes a voicing
close rather than spread across the neck.

One bug worth knowing: the first version put the bass at its lowest possible
fret, which sounds sensible and isn't. For C/E on the low strings it produced
`0-10-10` — a ten-fret stretch — because with the bass that low, the next
string couldn't reach the following chord tone without jumping an octave. The
fix tries both octave placements and keeps whichever is more compact, giving
`12-10-10`.

### 6.3 Pitch detection

**The algorithm — autocorrelation.** A pitched sound repeats. Slide a copy of
the signal against itself; the delay where it lines up best is the length of
one cycle. Frequency is `sampleRate ÷ thatDelay`.

The peak lands on a whole sample, but the true period rarely does, so a
parabola is fitted through the peak and its neighbours to interpolate between
samples.

**Three things real audio needed that clean tones didn't:**

**Speed.** Autocorrelation is O(n²) — doubling the samples quadruples the work.
At 44.1kHz it took **~130ms per cycle**, most of the tuner's perceived lag.
Guitar fundamentals only reach ~330Hz, so 44.1kHz is far more resolution than
the job needs. Averaging groups of 4 samples cuts the work about 16× and costs
under a cent of accuracy.

**Octave errors.** A guitar string produces harmonics, and the detector
sometimes locks onto one — reporting exactly double the true pitch. Fix: if a
reading is ~2× or ~0.5× the previous one, fold it back, then show the median of
the last three.

**Matching the wrong string.** Comparing a doubled reading against six absolute
target frequencies can land it closer to an unrelated string, which is why the
bottom three strings would occasionally read as the top three. Fix:
`matchToTuning` checks each target against the raw reading *and* its
octave-folded versions.

### 6.4 Playback

**The trick:** speeding a sound up raises its pitch — the record-player effect.
So four sampled notes an octave apart cover the whole neck: each note picks its
nearest sample and plays it faster or slower. 648KB of audio instead of the
~3MB one-sample-per-note would need.

This works because expo-audio has *no* independent pitch control — rate and
pitch are tied. Usually that's the complaint about it; here it's the feature.

**Making the samples sound like a guitar.** They're synthesised, not recorded.
The first attempt used Karplus-Strong, the standard plucked-string algorithm.
Its pitch comes from an integer delay-line length, and at high frequencies that
line is only a few dozen samples long, so rounding wrecks the tuning — the top
sample came out **47 cents sharp**, nearly a quarter tone. It was caught by
running the app's own pitch detector over the generated files.

Additive synthesis states every partial's frequency outright, so tuning is
exact. Then five things make it sound like a string rather than an organ:

| Feature | Why it matters |
|---|---|
| **Pluck-position comb filtering** | Picking 1/6 along the string cancels the 6th harmonic and its multiples. Verified by FFT: the 6th sits 47dB down where its neighbours are ~30dB. That notched spectrum is the strongest cue. |
| **Inharmonicity** | Real strings are stiff, so partials sit slightly *sharp* of exact multiples. That mistuning is the metallic shimmer. |
| **Two detuned polarisations** | A string vibrates in two planes at once. Summing two slightly detuned copies gives beating and a two-stage decay. |
| **Body resonance** | The air cavity rings near 100Hz, the top plate near 200Hz. Evenly weighted harmonics read as electronic. |
| **Pick attack** | A brief noise transient. Its absence is why a synthesised note seems to start from nowhere. |

The strum is humanised too — ±4ms of timing jitter and slight volume variation
per string, because a perfectly even roll is the giveaway that something is
sequenced rather than played.

---

## 7. How it was built, in order

1. **Scaffold** — Expo project, design tokens, five-tab navigation.
2. **Scale engine** — the fretboard and scale positions. Rebuilt once when the
   fret-window approach proved wrong.
3. **Tuner** — pitch detection. Several rounds: the audio API had changed
   between versions, then the algorithm needed hardening against real audio.
4. **Chords** — CAGED forms, then 15 qualities, then triads.
5. **Metronome and practice timer** — including two real timing bugs.
6. **Theme** — a full dark/light system, which meant restructuring how every
   component reads colour.
7. **Persistence** — preferences surviving a restart.
8. **Chords in a key** — connecting the scale and chord engines.
9. **Playback** — synthesised samples and pitch shifting.
10. **Tests, icon, documentation.**

**The pattern worth noticing:** almost every real bug was found by checking
output against a guitar, not by the code failing. A wrong note is still valid
JavaScript. That's the argument for the test suite — it encodes what the answer
*should* be, so the computer can check something it otherwise cannot.

---

## 8. Testing

```bash
npm install --legacy-peer-deps
npm test
```

103 tests over the engines: canonical CAGED boxes, every chord voicing in all
12 keys, all 576 triads, the diatonic chords of every key, and pitch detection
against generated tones.

Several exist because a specific wrong note was spotted on a real fretboard —
a missing B on the G string in A natural minor, an F missing at fret 18 on the
B string. Those are the most valuable tests in the suite.

**The suite is mutation-checked.** A passing suite proves nothing unless it can
detect breakage, so bugs already fixed were deliberately reintroduced to
confirm each one fails. Reverting the per-string reach fails 7 tests; flipping
one chord offset fails 3; making harmonic minor's V minor again fails 5.

**Why no UI tests:** the logic that can be silently wrong lives in `src/lib`,
and it's tested thoroughly. A wrong chord shape is a real bug; a button two
pixels off is not. That's a defensible line, but it is a gap.

---

## 9. Known limits

**The tuner is iOS only.** Expo's audio API exposes raw microphone data on iOS
but not Android, and pitch detection needs raw samples. A newer expo-audio adds
a real-time PCM stream that would fix this and make the iOS tuner continuous
rather than chunked; it needs an SDK upgrade, and Android support for it
currently has an open upstream bug.

**Two harmonic minor sevenths can't be voiced.** The minor-major 7th on i and
the augmented-major 7th on III have no equivalent in the chord engine, so they
display as their triad and say so, rather than being mislabelled.

**The metronome is timed in JavaScript.** Tempo doesn't drift, but individual
beats can jitter a few milliseconds in a way a hardware metronome wouldn't.

**No CI.** The tests run when someone runs them.

---

## 10. Glossary

| Term | Meaning |
|---|---|
| **Pitch class** | A note name without an octave. 0–11, C to B. |
| **MIDI number** | A note *with* an octave, as one number. 60 = middle C, 69 = A440. |
| **Interval** | Distance between two notes in semitones. |
| **Cent** | 1/100th of a semitone. ~5 cents off is in tune. |
| **Root** | The note a scale or chord is built on. |
| **Triad** | A three-note chord: root, third, fifth. |
| **Inversion** | The same chord with a different note in the bass. |
| **Diatonic** | Belonging to a key — built only from that scale's notes. |
| **CAGED** | Five movable shapes derived from the open C, A, G, E and D chords. |
| **Barre** | One finger flattened across several strings. |
| **Voicing** | One particular way of playing a chord. |
| **Autocorrelation** | Comparing a signal against delayed copies of itself to find its repeat period. |
| **Harmonic / partial** | A frequency component above the fundamental, usually a whole multiple of it. |
| **Inharmonicity** | Real strings' partials sitting slightly sharp of exact multiples. |
| **Sample rate** | Audio measurements per second. 44,100 is CD quality. |
| **Hydration** | Loading saved state from storage back into the app at startup. |
