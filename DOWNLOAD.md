# Download SayNext

Latest release:

**https://github.com/Leo-hypno/saynext/releases/latest**

## Which File Should I Download?

| System | File |
| --- | --- |
| Mac Apple Silicon | `SayNext-0.1.2-darwin-aarch64-dmg.dmg` |
| Mac Intel | `SayNext-0.1.2-darwin-x64-dmg.dmg` |
| Windows | `SayNext-0.1.2-windows-x64-nsis-setup.exe` |

## Notes

- macOS and Windows may show a security warning because SayNext is not OS-code-signed yet.
- If macOS says SayNext is damaged, move SayNext to Applications, then run:

```bash
xattr -dr com.apple.quarantine /Applications/SayNext.app
open /Applications/SayNext.app
```

- Users on `v0.1.0` should manually install `v0.1.1` once.
- Starting from `v0.1.1`, future versions can be installed through SayNext's in-app updater.
