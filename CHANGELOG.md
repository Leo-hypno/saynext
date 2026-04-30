# Changelog

All notable changes to SayNext are documented here.

This project follows Semantic Versioning.

## [0.1.4] - 2026-05-01

### Added

- Added a keyboard shortcut for favoriting the selected prompt.
- Added custom prompts with placement in built-in contexts.
- Added manual appearance selection for system, light, and dark modes.
- Added everyday AI usage prompts for documents, reports, travel planning, and life decisions.
- Added clearer localized header and language selector labels.

### Changed

- Simplified navigation around context tabs, recent prompts, favorites, and custom prompts.
- Improved prompt list density, keyboard behavior, and settings panel polish.
- Updated README and GitHub-facing docs to match the current product flow.
- Kept prompt order stable when favoriting items inside normal context tabs.

### Removed

- Removed the search UI and outdated search documentation.
- Removed the copy-after-auto-hide setting.

## [0.1.3] - 2026-04-30

### Added

- macOS release workflow now supports Developer ID signing and notarization.

### Changed

- Download documentation now points to the `v0.1.3` installers.
- Release notes now distinguish signed macOS builds from unsigned Windows builds.

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
