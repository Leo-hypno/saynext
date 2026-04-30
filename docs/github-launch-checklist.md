# GitHub Launch Checklist

SayNext is designed to earn stars by being immediately understandable, useful, and easy to contribute to.

## Before First Public Push

- [ ] Replace placeholder repository URLs with the real GitHub URL.
- [ ] Add one clear screenshot of the palette.
- [ ] Add one short demo GIF showing hotkey, search, copy, and paste.
- [ ] Confirm the app launches on macOS.
- [ ] Confirm the app builds on Windows.
- [ ] Run `npm run validate:packs`.
- [ ] Run `npm run typecheck`.
- [ ] Run `npm run build`.
- [ ] Run `cargo check` in `apps/desktop/src-tauri`.
- [ ] Run `npm run check`.
- [ ] Confirm `.github/workflows/release.yml` creates a draft release from a `v*.*.*` tag.
- [ ] Review the generated unsigned installers before publishing the draft release.

## README Must Communicate

- [ ] The problem: beginners do not know what to ask AI next.
- [ ] The solution: a hotkey rescue-prompt palette.
- [ ] The privacy promise: offline-first, no account, no tracking.
- [ ] The contribution path: prompt packs are JSON and non-programmers can help.
- [ ] The current status: early MVP, not yet a polished signed release.
- [ ] The release flow links to `docs/release.md`.

## Star-Worthy Polish

- [ ] Native macOS and Windows window controls.
- [ ] Remembered window position.
- [ ] Reset window position from Settings.
- [ ] Copy success and failure feedback.
- [ ] Favorites and recent prompt tab.
- [ ] Next-step prompts for moving stuck conversations forward.
- [ ] Traditional Chinese and English packs.
- [ ] Clear good-first-issue list.
- [ ] Screenshots that show real prompts, not empty UI.

## First Issues To Open

- Add Simplified Chinese prompt pack.
- Add Japanese prompt pack.
- Add better fuzzy search.
- Test and polish Windows tray behavior.
- Add import prompt pack flow.
- Add custom hotkey setting.
- Create website/demo page.

## Release Notes Template

```md
## SayNext v0.1.0

SayNext is a tiny desktop palette that helps AI beginners ask the next better question.

Highlights:

- Global hotkey prompt palette
- Click or press Enter to copy
- Traditional Chinese and English starter packs
- Favorites and recent prompt tab
- Native window controls and remembered window position
- Offline-first, no account, no tracking

Known limitations:

- No signed installer yet
- Prompt packs are bundled at build time
- Custom hotkey settings are planned
```
