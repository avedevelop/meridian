# macOS

macOS is the stable Meridian desktop target.

## Supported builds

- Apple Silicon: `Meridian-X.Y.Z-arm64.dmg`
- Intel: `Meridian-X.Y.Z.dmg`

Both files are attached to the same GitHub Release tag as the Windows installer.

## Build

```bash
cd meridian
npm run build:mac
```

The release workflow runs this on `macos-latest` and uploads every generated DMG.

## First launch

Current public builds are unsigned and not notarized. On first launch:

1. Open the DMG.
2. Drag Meridian into Applications.
3. Right-click Meridian.
4. Choose **Open**.
5. Confirm the Gatekeeper prompt once.

Future signing and notarization work should not change the shared app release tag strategy.
