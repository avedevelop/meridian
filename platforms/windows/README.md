# Windows

Windows is published from the same Meridian source tree and the same release tag as macOS.

## Supported build

- Windows x64 installer: `Meridian-X.Y.Z-windows-x64.exe`

Windows builds are first-class release assets. The installer should open from the Start Menu and desktop shortcut after installation.

## Build

```bash
cd meridian
npm run build:win
```

The release workflow runs this on `windows-latest` and uploads `dist/*windows*.exe`.

## QA scope

Windows uses the same renderer, editor, vault, welcome-vault, plugin, settings, and Ask Vault code as macOS. QA should still verify platform-specific behavior:

- installer behavior;
- window close/minimize behavior;
- keyboard layouts such as German, Russian, and US;
- context menu positioning on non-fullscreen windows;
- filesystem edge cases on Windows paths.

Windows QA should verify the same app flows as macOS plus the Windows-specific items above.
