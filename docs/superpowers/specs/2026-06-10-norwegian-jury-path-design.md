# Norwegian Jury Path — Drømtorp Awards Submission

**Date:** 2026-06-10
**Deadline:** 2026-06-11 (submission for Drømtorp Awards, VG1 IT og Medieproduksjon nomination)
**Goal:** Polish the exact path the jury will take — website → download → install → first launch — with Norwegian (bokmål) localization throughout.

## Context

The jury installs Meridian themselves (Mac or Windows) by downloading from the site. Current state:

- App i18n: `en`, `ru` only. Jury is Norwegian.
- Site: `en`, `ru` pages only.
- Site has **no install instructions** — the app is unsigned, so macOS Gatekeeper blocks a plain double-click and Windows SmartScreen warns. Without guidance the jury may conclude the app is broken.
- Welcome vault (first-launch content, repo `meridian-welcome`): `macos/{en,ru}`, `windows/{en,ru}` — 13 notes, ~860 lines.

## Scope

### 1. App — Norwegian bokmål locale (`nb`)

- Add `meridian/src/renderer/src/i18n/locales/nb.json`, translated from `en.json` (602 lines). Locales are auto-discovered via `import.meta.glob` in `i18n/index.ts` — no i18n code changes needed.
- `appearanceSettings.tsx` (~line 67): add `{ value: 'nb', label: 'Norsk bokmål' }` to the language picker.
- `defaultVault.ts` `getWelcomeLanguage()`: map `nb`/`no` → `nb` (currently only `ru`, fallback `en`).

### 2. Welcome vault — Norwegian version

- In `meridian-welcome` repo: add `macos/nb/` and `windows/nb/` — bokmål translation of the 13 notes.
- Fallback to English already works, so this item is cut first if time runs out.

### 3. Site — Norwegian page + install instructions

- `meridian-site/astro.config.mjs`: add locale `no`.
- New pages `src/pages/no/` mirroring `/ru` structure, content in bokmål.
- Update `LangToggle.astro` for three languages.
- **New install-instructions block** ("Slik installerer du") near the download buttons, in all three languages:
  - macOS: right-click → Open to bypass Gatekeeper on first launch.
  - Windows: SmartScreen "More info" → "Run anyway".

### 4. Release

- Tag `v1.0.13` → CI builds DMG (arm64 + x64) + Windows EXE → site rebuild triggers automatically (existing workflow).

## Out of scope

- Any UI/feature changes in the app itself (too risky one day before deadline).
- Norwegian nynorsk (bokmål only).
- Code signing / notarization (no Apple Developer account; mitigated by install instructions).

## Work order

1. Site install instructions (highest risk reduction)
2. `nb.json` app translation
3. Site `/no` pages
4. Welcome vault `nb` (cut first if needed)
5. Release v1.0.13

## Success criteria

- Norwegian jury member lands on the site, reads it in bokmål, follows install instructions without confusion, and sees a bokmål UI (and ideally bokmål welcome notes) on first launch.
- `npm run typecheck && npm run lint && npm run test` pass in `meridian/`.
- Site builds (`npm run build` in `meridian-site/`).

## Risks

- **Translation quality:** machine-assisted bokmål reviewed in one pass; UI strings are short and formulaic, acceptable risk.
- **Release pipeline:** v1.0.12 released fine; reuse the same flow. Verify assets appear on the release before updating site links (links point to `/latest`, so they update automatically).
