# SayNext

An open-source desktop palette that helps you ask AI the next better question.

## Download

Get the latest installers from the GitHub Releases page:

**[Download SayNext v0.1.4](https://github.com/Leo-hypno/saynext/releases/latest)**

| System | Download this file |
| --- | --- |
| Mac Apple Silicon | `SayNext-0.1.4-darwin-aarch64-dmg.dmg` |
| Mac Intel | `SayNext-0.1.4-darwin-x64-dmg.dmg` |
| Windows | `SayNext-0.1.4-windows-x64-nsis-setup.exe` |

If Windows blocks the installer, choose "More info" then "Run anyway".

When ChatGPT, Claude, Gemini, or any AI tool gives a confusing answer, refuses too early, or you simply do not know what to ask next, press a hotkey and pick a rescue prompt.

> SayNext is not a prompt manager for people who already know what they want to ask.
> It is built for the moment before that.

## Why

AI beginners often give up when the model answers badly, explains poorly, or says "I cannot" too quickly.

SayNext gives them short, human rescue prompts that keep the conversation moving.

## Features

- Global hotkey palette
- Native macOS / Windows window controls
- Click or press Enter to copy
- Beginner-friendly rescue prompts
- Context tabs for common AI conversation moments
- Next-step prompts for moving a conversation forward
- Favorites and a recent prompt tab
- Custom prompts with optional placement in built-in contexts
- Manual light / dark / system appearance setting
- Remembered window position
- One-click reset to center from Settings
- Offline-first
- No account
- No AI API key
- No tracking
- Local JSON prompt packs
- Built with Tauri, React, and TypeScript

## Project Status

SayNext is in early public release. macOS and Windows installers are available on GitHub Releases, and in-app updates are available starting from `v0.1.1`.

macOS builds are signed and notarized starting from `v0.1.3`. Windows builds are not code-signed yet, so Windows may show a SmartScreen warning.

## How It Works

1. Press `Cmd/Ctrl + Shift + H` to show SayNext.
2. Choose a context, or use recent, favorites, or your own prompts.
3. Click a prompt, or use arrow keys and press Enter.
4. Paste into ChatGPT, Claude, Gemini, or any AI chat box.

SayNext stays local. It does not call an AI API and does not send analytics.

Keyboard flow:

- `← / →`: switch categories
- `↑ / ↓`: select a prompt
- `F`: favorite or unfavorite the selected prompt
- `Esc`: close settings or leave text editing
- `Enter`: copy the selected prompt

## Prompt Packs

Prompt packs live in `packs/`.

```text
packs/
├── zh-TW/
│   └── beginner-rescue.json
└── en/
    └── beginner-rescue.json
```

Each pack is a simple JSON file, so non-programmers can contribute new languages and better rescue prompts.

See [Prompt Pack Schema](docs/prompt-pack-schema.md).

## Release

Download the latest public release from [GitHub Releases](https://github.com/Leo-hypno/saynext/releases/latest).

Preparing a future release? See [GitHub Launch Checklist](docs/github-launch-checklist.md).
For versioning and GitHub Releases, see [Release Guide](docs/release.md).

## Development

Prerequisites:

- Node.js 20+
- npm
- Rust toolchain, required for running Tauri

Install dependencies:

```bash
npm install
```

Run the desktop app after Rust is installed:

```bash
npm run dev
```

Run the web UI only:

```bash
cd apps/desktop
npm run dev:web
```

Run the full local check:

```bash
npm run check
```

Build a local desktop installer:

```bash
npm run bundle
```

Update SayNext's version before a release:

```bash
npm run version:set -- 0.1.4
```

Validate prompt packs only:

```bash
npm run validate:packs
```

Generate the local development icon:

```bash
npm run make:icon
```

## Roadmap

- [x] Product definition
- [x] Prompt pack schema
- [x] Traditional Chinese beginner rescue pack
- [x] English beginner rescue pack
- [x] Desktop MVP UI
- [x] Prompt pack validation
- [x] Tauri global hotkey wiring
- [x] Clipboard integration
- [x] Tray/menu bar integration
- [x] Tray/menu bar close behavior
- [x] Native window controls and remembered position
- [x] Minimal settings panel
- [x] Settings persistence
- [x] Custom prompts
- [x] Manual appearance setting
- [ ] Prompt pack loader from local folder
- [x] macOS and Windows release builds
- [x] In-app updater foundation
- [ ] Demo GIF and screenshots

## Contributing

Contributions are welcome, especially prompt packs. You do not need to write code to help.

Good first contributions:

- Add a new language prompt pack
- Improve existing rescue prompts
- Add accessibility labels
- Test Windows tray behavior
- Create screenshots or demo GIFs

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

MIT
