# Platform Support

Meridian uses one shared Electron, React, and TypeScript app. Platform differences live in packaging, release assets, desktop behavior, and QA scope.

## Release model

Every public version is shipped as one GitHub Release under one tag:

```text
vX.Y.Z
├── Meridian-X.Y.Z-arm64.dmg
├── Meridian-X.Y.Z.dmg
└── Meridian-X.Y.Z-windows-beta-x64.exe
```

The release workflow builds macOS and Windows separately, then rebuilds the website only after both platform jobs finish. This keeps the website download cards aligned with the release assets.

## Platform status

| Platform | Status | Build command | Public asset |
| --- | --- | --- | --- |
| macOS Apple Silicon | Stable | `npm run build:mac` | `Meridian-X.Y.Z-arm64.dmg` |
| macOS Intel | Stable | `npm run build:mac` | `Meridian-X.Y.Z.dmg` |
| Windows x64 | Beta | `npm run build:win` | `Meridian-X.Y.Z-windows-beta-x64.exe` |
| Linux | Not released | `npm run build:linux` | none |

## Platform docs

- [macOS](macos/README.md)
- [Windows beta](windows/README.md)
