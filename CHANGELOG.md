# Changelog

All notable changes to SayNext are documented here.

This project follows Semantic Versioning.

## [0.1.8] - 2026-05-04

### Added

- Added full localization for website and app settings entry points, including English-first first-run language selection behavior.
- Added onboarding hints and clearer language around "beginner AI rescue" scenarios.
- Added support for richer custom prompt workflows: move/edit within categories, favorite-first ordering in custom sections, and safer import/export handling.

### Changed

- Refined UI layout for a compact startup experience and improved first-run discoverability of the latest installer.
- Optimized desktop palette interaction details (prompt selection, keyboard behavior, and favorites flow).
- Added clearer GitHub landing page messaging, updated screenshots/demo references, and improved section clarity.

### Fixed

- Prevented keyboard selection drift after favoriting prompts and ensured selection tracks the same prompt after reorder.
- Fixed language-switch regressions for update/copy related status messages.
- Added explicit safeguards against prompt ID collisions when importing custom packs.
- Removed hard-coded English copy leakage in localized update/error flows.

## [0.1.7] - 2026-05-01

### Changed

- Replaced the placeholder multilingual prompt packs with fully localized prompt titles, prompt text, categories, descriptions, and tags.
- Added localized app interface copy for Japanese, Korean, Spanish, French, German, and Brazilian Portuguese.

### Fixed

- Removed fake multilingual prompts that only prepended “respond in this language” instructions to English text.

## [0.1.6] - 2026-05-01

### Added

- Added a first-run language selection screen with English as the default.
- Added common prompt packs for Japanese, Korean, Spanish, French, German, and Brazilian Portuguese.
- Added a multilingual GitHub Pages landing page with Traditional Chinese, English, and Japanese.

### Changed

- Improved the website language selector into a compact dropdown inspired by mature multilingual product sites.
- Improved website language persistence and browser-language detection.

### Fixed

- Fixed language selector text clipping in the desktop app header.
- Improved compact website language menu behavior on mobile.

## [0.1.5] - 2026-05-01

### Added

- Added first-run onboarding tips and a demo GIF for the GitHub README.
- Added favorite-first ordering inside regular categories and custom prompts.

### Changed

- Improved custom prompt import safety, editing, category movement, and backup flow.
- Improved keyboard selection stability when favoriting prompts.
- Improved localized copy, update errors, and language switching behavior.
- Improved the GitHub Pages product story and mobile layout polish.

### Fixed

- Fixed Enter handling around onboarding controls.
- Fixed palette header clipping in compact desktop windows.
- Fixed update error messages staying in the previous language after switching languages.

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
