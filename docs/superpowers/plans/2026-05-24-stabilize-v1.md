# Plan: Stabilize v1.0 (no release track)

> Workspace: `/Users/vladyslav/Desktop/dev/new project/meridian` only.
> One task = one commit. **No** signed builds, CI, CHANGELOG release, or notarization in this plan.

**Goals:** Community plugins work end-to-end, i18n gaps closed, graph/plugin UX polish, scope for future milestones documented.

**Skipped:** Part B (Release / CI) — by user request.

---

## Part A — Community plugins (P0)

- [ ] A1: Commit `SettingsCommunityPluginsSection` vault dependency fix
- [ ] A2: Refetch plugin list when Community tab becomes active
- [ ] A3: Test `listPluginManifests` in `tests/main/vault.test.ts`
- [ ] A4: Copy `sample-plugin` into repo `meridian/demo-vault/.meridian/plugins/meridian-sample/` for local testing
- [ ] A5: Update `PLUGIN_DEVELOPMENT.md` smoke checklist

---

## Part C — i18n (P1)

- [ ] C1: Grep hardcoded UI strings in Settings community + graph banner
- [ ] C2: Add missing `ru.json` / `en.json` keys
- [ ] C3: Remove or wire `listUserLocales` dead path in `i18n/index.ts`

---

## Part D — UX polish (P2)

- [ ] D1: Graph banner copy — show total vs displayed clearly (i18n)
- [ ] D2: `localStorage` to skip repeated «all nodes slow» confirm in session
- [ ] D3: «Reload plugins» button in Community settings
- [ ] D4: Toast on community plugin load failure (via existing toast if any)

---

## Part E — Scope next milestones

- [ ] E1: Add «Next milestones (not v1.0)» section to `meridian/SCOPE.md`

---

## Verification

```bash
cd meridian && npm run typecheck && npm run test && npm run check-lines
```

Smoke: meridian-welcome vault → Settings → Plugins → Community → enable Sample → ⌘K command.
