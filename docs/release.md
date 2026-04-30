# Release Guide

This guide describes the manual release flow before in-app updates are enabled.

## Release Policy

SayNext uses Semantic Versioning.

- Patch, such as `0.1.1`: bug fixes and copy changes.
- Minor, such as `0.2.0`: new features that keep existing behavior stable.
- Major, such as `1.0.0`: stable public release or breaking changes after 1.0.

## Prepare a Version

Update all app version files:

```bash
npm run version:set -- 0.1.1
```

Update `CHANGELOG.md`, then run:

```bash
npm run check
```

Optional local installer build:

```bash
npm run bundle
```

## Create a GitHub Release

Commit the release changes:

```bash
git add package.json package-lock.json apps/desktop/package.json apps/desktop/src-tauri/tauri.conf.json CHANGELOG.md
git commit -m "Release v0.1.1"
```

Tag and push:

```bash
git tag v0.1.1
git push origin main
git push origin v0.1.1
```

Pushing the tag starts `.github/workflows/release.yml`.

The workflow builds:

- macOS Apple Silicon
- macOS Intel
- Windows x64

The workflow creates a draft GitHub Release. Review the generated installers, edit release notes if needed, then publish the draft.

## Current Signing Status

The first open-source releases can be unsigned, but users may see operating-system security warnings.

Before a wider public launch:

- Configure Apple Developer ID signing and notarization for macOS.
- Configure a Windows code signing certificate.
- Enable Tauri updater signing for in-app updates.

## In-App Updates Later

In-app updates will use the Tauri updater plugin. That requires:

- `@tauri-apps/plugin-updater`
- `tauri-plugin-updater`
- A Tauri updater signing key pair
- `TAURI_SIGNING_PRIVATE_KEY` stored only in GitHub Actions secrets
- A public key configured in `tauri.conf.json`
- Release artifacts with updater signatures
