<div align="center">

```
  ____  _   ___   _ _____ _   _ __  __    ____ ___      _    ____ _____ _____ ____  
 |  _ \| | | \ \ / |_   _| | | |  \/  |  / ___/ _ \    / \  / ___|_   _| ____|  _ \ 
 | |_) | |_| |\ V /  | | | |_| | |\/| | | |  | | | |  / _ \ \___ \ | | |  _| | |_) |
 |  _ <|  _  | | |   | | |  _  | |  | | | |__| |_| | / ___ \ ___) || | | |___|  _ < 
 |_| \_\_| |_| |_|   |_| |_| |_|_|  |_|  \____\___/ /_/   \_\____/ |_| |_____|_| \_\
```

### 軌道律動神殿 // SACRED NEURAL ACOUSTIC ODYSSEY

[![Protocol](https://img.shields.io/badge/PROTOCOL-RC--26-e63946?style=for-the-badge&labelColor=0b0b0e)](https://github.com)
[![Model](https://img.shields.io/badge/ENGINE-GOOGLE%20LYRIA-d4a373?style=for-the-badge&labelColor=0b0b0e)](https://deepmind.google/technologies/lyria/)
[![License](https://img.shields.io/badge/SEAL-HANKO%20VERIFIED-2a9d8f?style=for-the-badge&labelColor=0b0b0e)](https://github.com)

<p align="center">
  <b>A high-fidelity rhythm game fusing Japanese Modernist Poster Design, Sacred Celestial Architecture, and real-time generative music synthesis powered by Google's Lyria AI.</b>
</p>

---

</div>

## ◬ Overview // 概要

**Rhythm Coaster** reimagines the Stepmania / arcade rhythm experience as an esoteric acoustic temple. Players travel along celestial rails, striking kinetic notes synchronized to dynamic musical compositions.

Every stage can be **generated from thin air** using Google's Lyria neural model—complete with strict structural movements, energy progression curves, and precision beatmaps—or constructed by **dropping your own audio files** into the in-app analyzer.

```
+-----------------------------------------------------------------------------------+
|  [ ARCHIVE REF: RC-2026 ]                     [ LAT 35°41′N // LONG 139°46′E ]   |
|                                                                                   |
|         極音                                                                      |
|        [ 律動 ]  RHYTHM COASTER                                                   |
|                  NEURAL COMPOSITION FORGE & SACRED KINETIC RAIL                   |
|                                                                                   |
|  [01: ◂ LEFT ]    [02: ▾ DOWN ]    [03: ▴ UP ]    [04: ▸ RIGHT ]                  |
|  VERMILION #e639  SOLAR GOLD #d4a3  JADE CYAN #2a9d BONE WHITE #f5f2              |
+-----------------------------------------------------------------------------------+
```

---

## ✦ Key Features // 特徴

### 1. Neural Track Synthesis (Google Lyria)
- **Structured Movements**: Synthesizes authentic song architecture (Prelude $\rightarrow$ Verse $\rightarrow$ High Resonance Chorus $\rightarrow$ Climax $\rightarrow$ Outro).
- **Tempo Locking**: Strictly calibrated BPM tempos (90 BPM Apprentice, 128 BPM Adept, 150 BPM Master).
- **Infinite Styles**: Electronic, Taiko Rock, Fluid Pop, Syncopated Hip-Hop, Avant-Garde Jazz, or custom style prompts.

### 2. Autonomous In-App Song Importer (.MP3 / .WAV / .JSON)
- **One-Step Audio Drop**: Drop any `.mp3`, `.wav`, `.ogg`, or `.m4a` file directly into the browser.
- **Web Audio Peak Analysis**: Client-side onset detection analyzes spectral energy and calculates tempo to synthesize a synchronized 4-column beatmap on the fly.
- **Procedural Modernist Cover Art**: If no cover image is provided, a 600×600 Japanese modernist poster cover is generated dynamically on an HTML5 canvas with celestial astrolabe rings and Hanko stamps.
- **Custom JSON Support**: Drag & drop your own custom `.json` beatmap alongside your audio, or export the auto-generated beatmap to inspect and edit.
- **IndexedDB Persistence**: Uploaded songs and artwork are saved permanently in the browser's local database.

### 3. Sacred Geometry Canvas Playfield
- **Architectural Rail Columns**: Sleek guide tracks with coordinate ticks and vertical light beams that ignite upon keystroke.
- **Directional Diamond Runes**: High-contrast, color-coded seals with direction chevrons.
- **Calligraphic Hanko Judgment Stamps**:
  - `極 PERFECT` (Cinnabar Red & Solar Gold shockwave ring with particle sparks)
  - `優 GREAT` (Jade Emerald ring)
  - `良 GOOD` (Solar Amber pulse)
  - `逸 MISS` (Charcoal smoke & broken line)

### 4. Ritual Clearance Certificate
- Computes aggregate harmonic scores, accuracy percentage, and peak overdrive combo.
- Awards ceremonial Hanko ranking seals:
  - `神技 SS` (Divine Resonance — 98%+ Accuracy, Full Combo)
  - `極等 S` (Master Transmission — 93%+)
  - `優位 A` (High Harmony — 85%+)
  - `良品 B` (Adept Performance — 75%+)
  - `修練 C` (Apprentice)
- Export master `.wav` audio recordings and beatmap `.json` files.

---

## ⚡ Quickstart // 起動手順

### Prerequisites
- [Node.js](https://nodejs.org/) (version 18 or higher recommended)
- A [Gemini API Key](https://aistudio.google.com/) (for real-time Lyria music composition)

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/rhythm-coaster.git
cd rhythm-coaster

# Install dependencies
npm install

# Configure environment secrets
cp .env.example .env.local
# Add your GEMINI_API_KEY to .env.local

# Launch development server
npm run dev
```

Open `http://localhost:3000` in your browser.

---

## ⌖ Beatmap Specification // 譜面仕様

Beatmaps are defined as lightweight JSON arrays. Each note object specifies when it crosses the judgment gate and which column it occupies:

```json
[
  { "time": 3.250, "column": 0 },
  { "time": 3.750, "column": 1 },
  { "time": 4.250, "column": 2 },
  { "time": 4.750, "column": 3 }
]
```

### Lane Mapping (`column`)
| Index | Key | Glyph | Color | Traditional Tone |
| :---: | :---: | :---: | :---: | :--- |
| `0` | `←` Left Arrow | `◂` | `#e63946` | **Cinnabar / Vermilion (朱色)** |
| `1` | `↓` Down Arrow | `▾` | `#d4a373` | **Solar Ochre / Gold (琥珀)** |
| `2` | `↑` Up Arrow | `▴` | `#2a9d8f` | **Jade / Celestial Cyan (青磁)** |
| `3` | `→` Right Arrow | `▸` | `#f5f2eb` | **Bone / Raw Rice Paper (白磁)** |

*Note: The parser automatically accepts both seconds and milliseconds, and supports nested schemas like `{ "notes": [...] }` or string directions (`"left"`, `"down"`, `"up"`, `"right"`).*

---

## 🎮 Controls // 操作方法

| Input | Desktop | Mobile / Touch |
| :--- | :--- | :--- |
| **Lane 0 (Left)** | `←` or `Left Arrow` | Swipe Left |
| **Lane 1 (Down)** | `↓` or `Down Arrow` | Swipe Down |
| **Lane 2 (Up)** | `↑` or `Up Arrow` | Swipe Up |
| **Lane 3 (Right)** | `→` or `Right Arrow` | Swipe Right |

---

## ⛩️ Architectural Aesthetic & Visual Language

The visual design is grounded in three aesthetic pillars:
1. **Japanese Modernist Poster Art**: Inspired by mid-century masters (Ikko Tanaka, Yusaku Kamekura, Kiyoshi Awazu)—stark typographic hierarchy, micro registration marks (`+`), bilingual badges, and bold vermilion sun geometry.
2. **Sacred Astrolabe Geometry**: Concentric rotating celestial rings, cardinal ticks, and radial coordinate alignments.
3. **Architectural Sublime**: Monolithic gate columns and esoteric temple geometries inspired by early 20th-century visionary art (Herbert Crowley's *Temple of Dreams*).

---

## 🛠️ Tech Stack // 技術構成

- **Framework**: [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- **Build Tool**: [Vite 6](https://vite.dev/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Audio Analysis**: Web Audio API (`AudioContext`, `decodeAudioData`, Energy Transients & RMS)
- **Local Persistence**: Browser [IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)
- **Typography**: Google Fonts (*Syne*, *Shippori Mincho*, *Space Grotesk*, *JetBrains Mono*)
- **Generative AI**: [@google/genai](https://www.npmjs.com/package/@google/genai) (Google Lyria Music Model)

---

<div align="center">
  <sub>TEMPLE ARCHIVE RC-2026 // CRAFTED WITH REVERENCE FOR SACRED RHYTHM GEOMETRY</sub>
</div>
