# Auto-Typer

A sophisticated human-like typing simulator with advanced behavior modeling. Built with Electron, React, TypeScript, and TailwindCSS.

**Developed by [Axier](https://axier.dev)**

![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/react-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB)
![Electron.js](https://img.shields.io/badge/Electron-191970?style=for-the-badge&logo=Electron&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/tailwindcss-%2338B2AC.svg?style=for-the-badge&logo=tailwind-css&logoColor=white)
![Vite](https://img.shields.io/badge/vite-%23646CFF.svg?style=for-the-badge&logo=vite&logoColor=white)
![macOS](https://img.shields.io/badge/mac%20os-000000?style=for-the-badge&logo=macos&logoColor=F0F0F0)

## Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [Installation](#installation)
- [Configuration](#configuration)
- [Keyboard Shortcuts](#keyboard-shortcuts)
- [Project Structure](#project-structure)
- [Technical Details](#technical-details)
- [Contributing](#contributing)
- [License](#license)

## Features

### Core Functionality

- **Planning Functions**: Pre-calculate entire typing sequences before execution
- **Timing & Randomness**: Convert WPM to realistic delays with human-like jitter
- **Mistake & Correction**: Realistic typos based on keyboard proximity with backspace corrections
- **Human Behavior**: Punctuation pauses, thinking pauses, burst typing, and speed variations

### Advanced Features

- **Adjustable Speed**: Set typing speed from 10 to 200 WPM
- **Mistake Simulation**: Configurable error rate with keyboard-neighbor-based typos
- **Dynamic Behavior**: Speed and mistake rates adjust throughout typing
- **Pause/Resume**: Full control over typing execution
- **Real-time Statistics**: Track progress, WPM, and timing
- **Modern Dark UI**: Beautiful, sleek interface with smooth animations

## Architecture

### Function Groups

#### 1. Planning Functions
- `planTyping(text, settings)` - Main orchestrator that creates the full typing plan
- `createNormalTypeEvent(text, index, settings)` - Generate single character event
- `createMistakeSequence(text, index, settings)` - Create typo + correction sequence

#### 2. Timing & Randomness
- `wpmToBaseDelayMs(wpm)` - Convert WPM to millisecond delays
- `getBaseDelayForChar(char, settings)` - Base delay for each character type
- `addRandomNoiseToDelay(baseDelayMs, settings)` - Add human-like randomness
- `getContextExtraDelay(text, index, settings)` - Pauses for punctuation, long words, etc.
- `getBurstTypingMultiplier(settings)` - Simulate fast typing bursts
- `getBackspaceDelay(settings)` - Realistic backspace timing

#### 3. Mistake & Correction
- `shouldStartMistake(text, index, settings, progress)` - Decide when to make typos
- `decideExtraLettersAfterMistake(settings)` - How many chars to type before noticing
- `chooseWrongChar(correctChar)` - Select realistic wrong character
- `generateDeleteEvents(count, settings)` - Create backspace sequence
- `generateRetypeEvents(correctChars, settings)` - Retype correctly
- `createTranspositionMistake(text, index, settings)` - Letter swapping ("teh" → "the")

#### 4. Human Behavior (Extras)
- `detectWordDifficulty(word)` - Analyze word complexity
- `adjustMistakeProbabilityOverTime(position, totalLength, baseProbability)` - Vary error rate
- `adjustSpeedOverTime(position, totalLength)` - Simulate fatigue/warmup
- `shouldInsertMicroPause(settings)` - Random small pauses
- `shouldInsertThinkingPause(text, index, settings)` - Longer contemplation pauses
- `estimateTotalTime(events)` - Calculate total typing duration

## Installation

### Option 1: Download Pre-built App (Recommended)

Download the latest `.dmg` file from the [GitHub Releases](https://github.com/axier-sho/Auto-Typer/releases) page:

1. Go to [Releases](https://github.com/axier-sho/Auto-Typer/releases)
2. Download `Auto-Typer-x.x.x-arm64.dmg` (Apple Silicon) or `Auto-Typer-x.x.x-x64.dmg` (Intel Mac)
3. Open the DMG file
4. Drag Auto-Typer to your Applications folder
5. Launch from Applications

### Option 2: Build from Source

#### Prerequisites

- Node.js 16+ and npm
- macOS (for building Mac app)

#### Setup

```bash
# Clone the repository
git clone https://github.com/axier-sho/Auto-Typer.git
cd Auto-Typer

# Install dependencies
npm install

# Start development server
npm run dev
```

This will start:
1. Vite dev server on http://localhost:5173
2. Electron app in development mode

#### Building for Mac

```bash
# Build the app for macOS
npm run build:mac
```

This creates a `.dmg` file in the `release/` directory that can be:
- Opened and dragged to Applications folder
- Distributed to other Mac users

## Configuration

### Typing Settings

All settings are adjustable in the UI:

- **Words Per Minute (10-200)**: Target typing speed
- **Speed Randomness (0-2)**: 
  - 0 = Smooth/robot-like
  - 1 = Normal human variation
  - 2 = High variation
- **Mistake Probability (0-50%)**: Chance of typo per character
- **Extra Letters After Mistake (0-10)**: Continue typing before noticing error

### Behavior Toggles

- **Punctuation Pauses**: Pause after ., ?, !, etc.
- **Long Word Pauses**: Hesitate before long/difficult words
- **Burst Typing**: Random bursts of fast typing
- **Micro Pauses**: Small thinking pauses at word boundaries
- **Thinking Pauses**: Longer pauses before complex constructs
- **Adjust Speed Over Time**: Speed varies throughout (warmup/fatigue)
- **Adjust Mistakes Over Time**: Error rate changes (careful → messy → careful)

## Keyboard Shortcuts

- `Cmd + Shift + X` - **Toggle typing** (start/pause) - Works from **any app globally**

## Project Structure

```
Auto-Typer/
├── electron/              # Electron main process
│   ├── main.ts           # App entry point
│   └── preload.ts        # Preload script
├── src/
│   ├── components/       # React UI components
│   │   ├── TextInput.tsx
│   │   ├── SettingsPanel.tsx
│   │   └── StatsDisplay.tsx
│   ├── engine/           # Core typing simulation
│   │   ├── planning.ts   # Main planning functions
│   │   ├── timing.ts     # Timing & randomness
│   │   ├── mistakes.ts   # Mistake generation
│   │   └── humanBehavior.ts  # Human behavior extras
│   ├── types/            # TypeScript types
│   │   └── typing.ts
│   ├── App.tsx           # Main app component
│   ├── main.tsx          # React entry point
│   └── index.css         # Global styles
├── package.json          # Dependencies & scripts
├── vite.config.ts        # Vite configuration
├── tailwind.config.js    # TailwindCSS config
└── tsconfig.json         # TypeScript config
```

## Technical Details

### Technologies Used

- **Electron**: Desktop app framework
- **React 18**: UI framework
- **TypeScript**: Type safety
- **Vite**: Fast build tool
- **TailwindCSS**: Utility-first CSS
- **Lucide React**: Icon library

### Typing Simulation Algorithm

1. **Planning Phase**: 
   - Parse input text
   - Generate events for each character
   - Calculate delays based on WPM + context
   - Insert mistakes and corrections
   - Add human behavior variations

2. **Execution Phase**:
   - Execute events sequentially
   - Track progress and statistics
   - Support pause/resume
   - Update UI in real-time

3. **Timing Strategy**:
   - Base delay from WPM
   - Character-specific adjustments (Shift, symbols)
   - Context-aware pauses (punctuation, sentences)
   - Random noise for human feel

4. **Mistake Generation**:
   - Keyboard neighbor mapping
   - Random extra keypresses
   - Realistic backspace rhythm
   - Letter transpositions

## Contributing

Feel free to submit issues and enhancement requests!

## License

MIT License - feel free to use this project for any purpose.

## Acknowledgments

Built with modern web technologies for realistic typing simulation.

**Developed by [Axier](https://axier.dev)**

Visit: [axier.dev](https://axier.dev)

---

Made for realistic typing simulation | Developed by [Axier](https://axier.dev)
