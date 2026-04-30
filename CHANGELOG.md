# Changelog

All notable changes to SayNext are documented here.

This project follows Semantic Versioning.

## [0.1.2] - 2026-04-30

### Fixed

- Windows release no longer opens an extra command prompt window.
- Closing an unrelated command prompt no longer force-quits SayNext on Windows.

## [0.1.1] - 2026-04-30

### Added

- In-app update check and install flow in Settings.
- Tauri updater and process plugins.
- GitHub Release updater endpoint and updater artifact signing configuration.

### Notes

- Users on `0.1.0` must install `0.1.1` manually once because `0.1.0` did not include the updater.
- Future releases can be installed from inside SayNext after the updater signing secret is configured.

## [0.1.0] - 2026-04-30

### Added

- Global hotkey desktop prompt palette.
- Traditional Chinese and English beginner rescue prompt packs.
- Search, category tabs, favorites, and recent prompts.
- Native macOS / Windows window controls.
- Remembered window position and reset action.
- Offline-first local prompt pack architecture.

### Known Limitations

- Installers are not signed yet.
- Prompt packs are bundled at build time.
