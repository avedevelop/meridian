# Windows Beta

Windows is published as a beta build from the same Meridian source tree and the same release tag as macOS.

## Supported build

- Windows x64 installer: `Meridian-X.Y.Z-windows-beta-x64.exe`

The `windows-beta` marker is part of the filename on purpose. It should stay there until Windows packaging and desktop behavior are validated enough to call it stable.

## Build

```bash
cd meridian
npm run build:win
```

The release workflow runs this on `windows-latest` and uploads `dist/*windows-beta*.exe`.

## Beta scope

The Windows beta uses the same renderer, editor, vault, default-vault, plugin, and settings code as macOS. The beta label is for platform-specific risk:

- installer behavior;
- window close/minimize behavior;
- keyboard layouts such as German, Russian, and US;
- context menu positioning on non-fullscreen windows;
- filesystem edge cases on Windows paths.

Windows QA should verify the same app flows as macOS plus the Windows-specific items above.
