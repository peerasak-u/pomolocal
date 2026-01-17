# 🍅 Pomolocal

A Mac-first, "Anti-Distraction" CLI Pomodoro timer that physically blocks sites in your browser.

## Features
- **Mac-First:** Native system notifications and sounds.
- **Local & Private:** No cloud, no accounts.
- **TUI:** Beautiful terminal interface with gradients and big text.
- **Browser Blocking:** Blocks distracting sites during focus sessions via Chrome Extension.

## Quick Start

Run instantly with bunx:

```bash
bunx pomolocal
```

## Installation (Local)

1. **Clone the repository:**
   ```bash
   git clone https://github.com/peerasak-u/pomolocal.git
   cd pomolocal
   bun install
   bun run build
   bun link
   ```

2. **Install the Browser Extension:**

   **Chrome / Brave / Edge / Arc:**
   - Go to `chrome://extensions`.
   - Enable **Developer Mode**.
   - Click **Load Unpacked**.
   - Select the `extension/chrome` folder.

   **Firefox:**
   - Go to `about:debugging`.
   - Click **This Firefox** (in the sidebar).
   - Click **Load Temporary Add-on...**.
   - Select the `manifest.json` file inside the `extension/firefox` folder.

## Usage

Run via bunx:

```bash
bunx pomolocal
```

Or run locally:

```bash
bun start
```

With custom settings:

```bash
bunx pomolocal --session 45m --relax 10m --loop 4
```

### Controls
- **Space**: Pause/Resume
- **s**: Skip current phase
- **q**: Quit

## Development

- **Dev:** `bun run src/index.tsx`
- **Build:** `bun run build`
