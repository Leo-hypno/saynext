# Architecture

SayNext is designed as a small offline-first desktop app.

## Stack

- Tauri 2 for desktop shell
- React and TypeScript for UI
- Plain CSS for styling
- JSON prompt packs for content

## Desktop Responsibilities

- Register global hotkey
- Show and hide floating palette
- Copy selected prompt to clipboard
- Manage tray/menu bar item
- Persist settings locally
- Bundle starter prompt packs at build time

## Frontend Responsibilities

- Render palette
- Search and filter prompts
- Track selected prompt
- Manage favorites and the recent prompt tab
- Render settings UI

## Data Flow

```text
prompt packs -> loader -> prompt index -> palette UI -> clipboard
```

The app should never require an account or remote service for core behavior.
