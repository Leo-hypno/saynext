# Apple Developer ID Signing

This guide is for preparing SayNext macOS releases with Developer ID signing and Apple notarization.

Signing and notarization remove the macOS "app is damaged" warning for downloaded builds.

## What You Need From Apple

You need an active Apple Developer Program account.

Create or collect:

- Developer ID Application certificate, exported from Keychain Access as `.p12`
- Password for that `.p12` export
- App Store Connect API Key with Developer access
- Issuer ID
- Key ID
- The downloaded `.p8` private key file

Apple login and two-factor authentication must be completed by the account owner.

## GitHub Secrets

Add these repository secrets:

- `APPLE_CERTIFICATE`: base64 text of the exported `.p12`
- `APPLE_CERTIFICATE_PASSWORD`: password used when exporting the `.p12`
- `APPLE_KEYCHAIN_PASSWORD`: any strong temporary password used for the GitHub Actions build keychain
- `APPLE_API_ISSUER`: App Store Connect Issuer ID
- `APPLE_API_KEY`: App Store Connect Key ID
- `APPLE_API_KEY_P8`: full text content of the downloaded `.p8` private key

Existing updater secrets are separate and still required:

- `TAURI_SIGNING_PRIVATE_KEY`
- `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`

## Convert the Certificate

After exporting the Developer ID Application certificate as `.p12`, convert it to base64:

```bash
openssl base64 -A -in /path/to/developer-id-application.p12 -out apple-certificate-base64.txt
```

The contents of `apple-certificate-base64.txt` become `APPLE_CERTIFICATE`.

## GitHub Actions

The release workflow imports the Developer ID certificate only on macOS jobs, writes the App Store Connect `.p8` key to a temporary file, and passes these values to Tauri:

- `APPLE_SIGNING_IDENTITY`
- `APPLE_API_ISSUER`
- `APPLE_API_KEY`
- `APPLE_API_KEY_PATH`

The Windows job is unaffected.

## Important

Do not commit `.p12`, `.p8`, passwords, or base64 certificate text to the repository.

Version tags and GitHub Releases should only be created after the owner explicitly approves a version update.
