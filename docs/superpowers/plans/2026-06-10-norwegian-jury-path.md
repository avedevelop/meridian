# Norwegian Jury Path Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Norwegian (bokmål) localization of the full jury path — site, install instructions, app UI, welcome vault — released as v1.0.13 before the Drømtorp Awards deadline (2026-06-11).

**Architecture:** Three repos: `meridian/` (Electron app, locales auto-discovered from `src/renderer/src/i18n/locales/*.json`), `meridian-site/` (Astro, all copy in `src/i18n/strings.ts`, thin page wrappers per locale), `~/Desktop/dev/meridian-welcome` (first-launch vault content, `{platform}/{lang}` folders, downloaded by the app from GitHub). No app logic changes except a 2-line language mapping.

**Tech Stack:** Electron 39 + React 18 + react-i18next, Astro + Cloudflare, vitest.

**Spec:** `docs/superpowers/specs/2026-06-10-norwegian-jury-path-design.md`

**Translation conventions (bokmål), used in all tasks:**

| English | Bokmål |
|---|---|
| Settings | Innstillinger |
| Vault | Hvelv |
| Note / Notes | Notat / Notater |
| Daily note | Dagsnotat |
| Graph view | Grafvisning |
| Tasks | Oppgaver |
| Search | Søk |
| Command palette | Kommandopalett |
| File / Folder | Fil / Mappe |
| Plugin(s) | Utvidelse(r) |
| Download | Last ned |
| Appearance | Utseende |
| Language | Språk |
| Welcome | Velkommen |

Keep all interpolation placeholders (`{{name}}`), HTML tags, markdown syntax, and wiki-link targets (`[[Note Name]]`) byte-identical to the English source. **Never translate file names or wiki-link targets** — the `ru` locale keeps English file names, `nb` does the same.

---

### Task 1: App — welcome-vault language mapping for `nb`

**Files:**
- Modify: `meridian/src/renderer/src/utils/defaultVault.ts`
- Test: `meridian/tests/renderer/defaultVault.test.ts`

- [ ] **Step 1: Write the failing tests**

Append to the existing `describe('default vault path', ...)` block in `meridian/tests/renderer/defaultVault.test.ts`:

```ts
  it('selects the macOS Norwegian welcome vault source for nb', () => {
    expect(getWelcomeVaultSourcePath('darwin', 'nb')).toBe('macos/nb')
  })

  it('selects the Windows Norwegian welcome vault source for no', () => {
    expect(getWelcomeVaultSourcePath('win32', 'no')).toBe('windows/nb')
  })
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd ~/Desktop/dev/new\ project/meridian && npx vitest run tests/renderer/defaultVault.test.ts`
Expected: 2 FAIL — received `macos/en` / `windows/en` instead of `nb`.

- [ ] **Step 3: Implement the mapping**

In `meridian/src/renderer/src/utils/defaultVault.ts` replace:

```ts
export type WelcomeLanguage = 'en' | 'ru'
```

with

```ts
export type WelcomeLanguage = 'en' | 'ru' | 'nb'
```

and replace `getWelcomeLanguage`:

```ts
export function getWelcomeLanguage(language?: string): WelcomeLanguage {
  if (/^ru\b/i.test(language ?? '')) return 'ru'
  if (/^(nb|no)\b/i.test(language ?? '')) return 'nb'
  return 'en'
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/renderer/defaultVault.test.ts`
Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
cd ~/Desktop/dev/new\ project
git add meridian/src/renderer/src/utils/defaultVault.ts meridian/tests/renderer/defaultVault.test.ts
git commit -m "feat: map nb/no language to Norwegian welcome vault"
```

---

### Task 2: App — `nb.json` locale + language picker entry

**Files:**
- Create: `meridian/src/renderer/src/i18n/locales/nb.json`
- Modify: `meridian/src/renderer/src/components/Settings/settingsDefinitions/appearanceSettings.tsx` (~line 66)

- [ ] **Step 1: Create `nb.json`**

Translate `meridian/src/renderer/src/i18n/locales/en.json` (602 lines) to bokmål, preserving the exact key structure and all `{{placeholders}}`. Use the terminology table above. Sample of expected style:

```json
{
  "settings": {
    "appearance": {
      "language": "Språk",
      "languageDesc": "Velg språk for grensesnittet"
    }
  },
  "vaultPicker": {
    "welcomeHeading": "Velkommen til Meridian",
    "welcomeDesc": "Velg et hvelv for å komme i gang"
  }
}
```

(Real keys/values come from `en.json` — the snippet shows tone and register only. Use informal «du», standard macOS/Windows bokmål conventions.)

Verification: `python3 -c "import json,sys; a=json.load(open('src/renderer/src/i18n/locales/en.json')); b=json.load(open('src/renderer/src/i18n/locales/nb.json')); ka=set(); kb=set();
def walk(d,p,s):
  [walk(v,p+'.'+k,s) if isinstance(v,dict) else s.add(p+'.'+k) for k,v in d.items()]
walk(a,'',ka); walk(b,'',kb); print('missing:',ka-kb); print('extra:',kb-ka)"`
Expected: `missing: set()` and `extra: set()`.

- [ ] **Step 2: Add picker option**

In `appearanceSettings.tsx`, change:

```tsx
          options={[
            { value: 'en', label: 'English' },
            { value: 'ru', label: 'Русский (Russian)' }
          ]}
```

to:

```tsx
          options={[
            { value: 'en', label: 'English' },
            { value: 'nb', label: 'Norsk bokmål' },
            { value: 'ru', label: 'Русский (Russian)' }
          ]}
```

- [ ] **Step 3: Run full app checks**

Run: `cd ~/Desktop/dev/new\ project/meridian && npm run typecheck && npm run lint && npm run test`
Expected: all pass (locales load via `import.meta.glob`, no code registration needed).

- [ ] **Step 4: Manual smoke test**

Run: `npm run dev`. In Settings → Appearance → Language pick «Norsk bokmål». Verify sidebar, status bar, settings, vault picker render in Norwegian; no `missingKey` warnings in devtools console. Quit dev server.

- [ ] **Step 5: Commit**

```bash
cd ~/Desktop/dev/new\ project
git add meridian/src/renderer/src/i18n/locales/nb.json meridian/src/renderer/src/components/Settings/settingsDefinitions/appearanceSettings.tsx
git commit -m "feat: add Norwegian bokmål (nb) locale"
```

---

### Task 3: Site — `no` locale plumbing + bokmål copy

**Files:**
- Modify: `meridian-site/src/i18n/strings.ts`
- Modify: `meridian-site/astro.config.mjs`

- [ ] **Step 1: Extend the Lang plumbing in `strings.ts`**

```ts
export type Lang = 'en' | 'ru' | 'no'

export const LANGS: { code: Lang; label: string; native: string }[] = [
  { code: 'en', label: 'EN', native: 'English' },
  { code: 'no', label: 'NO', native: 'Norsk' },
  { code: 'ru', label: 'RU', native: 'Русский' },
]
```

Replace `getLang` (line ~328):

```ts
export function getLang(astro: { currentLocale?: string }): Lang {
  const l = astro.currentLocale
  return l === 'ru' || l === 'no' ? l : 'en'
}
```

Replace `localeHref` (line ~338):

```ts
export function localeHref(currentPath: string, target: Lang): string {
  const stripped = currentPath.replace(/^\/(ru|no)(\/|$)/, '/')
  const trimmed = stripped.replace(/\/$/, '') || '/'
  if (target === 'en') return trimmed === '' ? '/' : trimmed
  if (trimmed === '/') return `/${target}`
  return `/${target}${trimmed}`
}
```

- [ ] **Step 2: Add the `no` dictionary**

Add `no: { ... }` to the `t` object, translating every key of `t.en` (~165 lines) to bokmål per the terminology table. Keep HTML markup inside `*Html` strings intact. Tone: same quiet-confident register as the English copy (e.g. hero `titleLine1: 'Vanlige filer,'`, `titleEm: 'stille'`, `titleLine2: ' programvare.'`).

Verification: `cd ~/Desktop/dev/new\ project/meridian-site && npx tsc --noEmit` (if no tsconfig check script exists, `npm run build` in Step 4 serves as the type gate — `t[lang]` indexing fails the build if a key set mismatches).

- [ ] **Step 3: Register the locale in `astro.config.mjs`**

```js
  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'ru', 'no'],
    routing: { prefixDefaultLocale: false },
  },
  integrations: [
    sitemap({
      i18n: {
        defaultLocale: 'en',
        locales: { en: 'en', ru: 'ru', no: 'no' },
      },
    }),
  ],
```

- [ ] **Step 4: Build**

Run: `cd ~/Desktop/dev/new\ project/meridian-site && npm run build`
Expected: build succeeds.

- [ ] **Step 5: Commit**

```bash
cd ~/Desktop/dev/new\ project/meridian-site
git add src/i18n/strings.ts astro.config.mjs
git commit -m "feat: add Norwegian (no) locale strings and routing"
```

---

### Task 4: Site — `/no` pages

**Files:**
- Create: `meridian-site/src/pages/no/index.astro`
- Create: `meridian-site/src/pages/no/docs/index.astro`
- Create: `meridian-site/src/pages/no/docs/changelog.astro`
- Create: `meridian-site/src/pages/no/docs/[...slug].astro`

- [ ] **Step 1: Copy the `ru` wrappers**

The `ru` pages are thin wrappers that derive language from the URL via `getLang(Astro)` — the `no` copies are byte-identical:

```bash
cd ~/Desktop/dev/new\ project/meridian-site/src/pages
mkdir -p no/docs
cp ru/index.astro no/index.astro
cp ru/docs/index.astro no/docs/index.astro
cp ru/docs/changelog.astro no/docs/changelog.astro
cp 'ru/docs/[...slug].astro' 'no/docs/[...slug].astro'
```

Then read each copied file and confirm: no hardcoded `'ru'` literals or `/ru/` links inside. If any exist, change them to derive from `getLang(Astro)` / `localeHref` the same way the file already does elsewhere.

- [ ] **Step 2: Build and verify routes**

Run: `npm run build && ls dist/no dist/no/docs 2>/dev/null || find dist -name "*.html" -path "*no*" | head`
Expected: `/no` and `/no/docs/...` pages exist in output (with the Cloudflare adapter, verify via `npx astro preview` and opening `http://localhost:4321/no` if dist layout differs).

- [ ] **Step 3: Visual check**

Run: `npx astro preview` (or `npm run dev`). Open `/no` — page renders in bokmål, language toggle shows EN/NO/RU, switching preserves the current page path.

- [ ] **Step 4: Commit**

```bash
git add src/pages/no
git commit -m "feat: add Norwegian landing and docs pages"
```

---

### Task 5: Site — install instructions block

**Files:**
- Modify: `meridian-site/src/i18n/strings.ts` (add `install` section to `download` block of all three languages)
- Modify: `meridian-site/src/components/Download.astro`

- [ ] **Step 1: Add strings (all three languages)**

Inside each language's `download` section in `strings.ts` add an `install` object. English:

```ts
      install: {
        title: 'How to install',
        lede: 'Meridian is open source and not yet code-signed, so your OS asks for one extra confirmation on first launch.',
        macTitle: 'macOS',
        macSteps: [
          'Open the DMG and drag Meridian into Applications.',
          'Right-click Meridian.app → Open.',
          'In the Gatekeeper dialog, click Open. Later launches work normally.',
        ],
        winTitle: 'Windows',
        winSteps: [
          'Run the downloaded .exe installer.',
          'If SmartScreen appears, click “More info”.',
          'Click “Run anyway”. Later launches work normally.',
        ],
      },
```

Norwegian:

```ts
      install: {
        title: 'Slik installerer du',
        lede: 'Meridian er åpen kildekode og ikke kodesignert ennå, så operativsystemet ber om én ekstra bekreftelse ved første oppstart.',
        macTitle: 'macOS',
        macSteps: [
          'Åpne DMG-filen og dra Meridian til Programmer.',
          'Høyreklikk på Meridian.app → Åpne.',
          'Klikk Åpne i Gatekeeper-dialogen. Senere starter appen som normalt.',
        ],
        winTitle: 'Windows',
        winSteps: [
          'Kjør den nedlastede .exe-installasjonsfilen.',
          'Hvis SmartScreen vises, klikk «Mer info».',
          'Klikk «Kjør likevel». Senere starter appen som normalt.',
        ],
      },
```

Russian:

```ts
      install: {
        title: 'Как установить',
        lede: 'Meridian — open source и пока не подписан сертификатом, поэтому при первом запуске система попросит одно дополнительное подтверждение.',
        macTitle: 'macOS',
        macSteps: [
          'Откройте DMG и перетащите Meridian в «Программы».',
          'Кликните правой кнопкой по Meridian.app → «Открыть».',
          'В диалоге Gatekeeper нажмите «Открыть». Дальше приложение запускается обычно.',
        ],
        winTitle: 'Windows',
        winSteps: [
          'Запустите скачанный .exe-установщик.',
          'Если появится SmartScreen — нажмите «Подробнее».',
          'Нажмите «Выполнить в любом случае». Дальше приложение запускается обычно.',
        ],
      },
```

- [ ] **Step 2: Render the block in `Download.astro`**

Read `Download.astro` first. After the download cards markup (end of the existing grid/cards container), insert a self-contained section using the component's existing `lang`/`t` access pattern (the component already imports `t, getLang` — reuse the same `const` it defines; if it names it differently, follow the file's convention):

```astro
{(() => { const inst = t[lang].download.install; return (
  <div class="install-guide">
    <h3 class="install-title">{inst.title}</h3>
    <p class="install-lede">{inst.lede}</p>
    <div class="install-cols">
      <div class="install-col">
        <h4>{inst.macTitle}</h4>
        <ol>{inst.macSteps.map((s) => <li>{s}</li>)}</ol>
      </div>
      <div class="install-col">
        <h4>{inst.winTitle}</h4>
        <ol>{inst.winSteps.map((s) => <li>{s}</li>)}</ol>
      </div>
    </div>
  </div>
) })()}
```

Add scoped styles to the component's `<style>` block, following its existing variables:

```css
.install-guide { margin-top: 48px; padding-top: 32px; border-top: 1px solid var(--rule); }
.install-title { font-size: 18px; margin: 0 0 8px; }
.install-lede { color: var(--text-faint); margin: 0 0 20px; max-width: 60ch; }
.install-cols { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 24px; }
.install-col h4 { margin: 0 0 8px; font-size: 14px; }
.install-col ol { margin: 0; padding-left: 20px; color: var(--text-faint); }
.install-col li { margin-bottom: 6px; }
```

(If `Download.astro` uses different CSS variable names, match what's already in the file.)

- [ ] **Step 3: Build and visual check**

Run: `npm run build && npx astro preview`
Check `/`, `/no`, `/ru` — install block renders under the download cards in the right language on all three.

- [ ] **Step 4: Commit**

```bash
git add src/i18n/strings.ts src/components/Download.astro
git commit -m "feat: add install instructions (Gatekeeper/SmartScreen) in en/no/ru"
```

---

### Task 6: Welcome vault — Norwegian content

**Files (repo `~/Desktop/dev/meridian-welcome`):**
- Create: `macos/nb/` (translate from `macos/en/`, 13 notes + canvas + folders)
- Create: `windows/nb/` (translate from `windows/en/` — differs from macOS in shortcuts/paths, translate separately)

- [ ] **Step 0: Review the unpushed commit**

Repo is `ahead 1` of origin. Run: `cd ~/Desktop/dev/meridian-welcome && git log origin/main..main --stat`
Understand what it is before pushing it together with the new work. If it's unrelated/unwanted, ask the user.

- [ ] **Step 1: Create `macos/nb/`**

```bash
cp -R macos/en macos/nb
```

Then translate the **content** of every `.md` file in `macos/nb/` to bokmål per the terminology table. Rules:
- Do NOT rename files or folders (`Getting Started.md` stays `Getting Started.md` — matches the `ru` convention).
- Do NOT change wiki-link targets `[[...]]`, asset paths, frontmatter keys, or the `.canvas` file's node IDs (translate only human-readable `text` values inside the canvas JSON).
- Keep keyboard shortcuts (⌘D etc.) as-is.

- [ ] **Step 2: Create `windows/nb/`**

```bash
cp -R windows/en windows/nb
```

Translate the same way (Windows version uses Ctrl-shortcuts and Windows paths — preserve those differences from its own `windows/en` source).

- [ ] **Step 3: Verify link integrity**

Run: `grep -rho '\[\[[^]]*\]\]' macos/nb | sort -u | head -20` and compare with the same command on `macos/en`.
Expected: identical link target sets.

- [ ] **Step 4: Commit and push**

```bash
git add macos/nb windows/nb
git commit -m "feat: add Norwegian bokmål welcome vault"
git push origin main
```

Verify on GitHub that `avedevelop/meridian-welcome` (the URL the app downloads from, `VaultPicker.tsx:9`) shows the `nb` folders — `bvsmma` → `avedevelop` should redirect; if the push landed on a different repo, stop and resolve with the user.

- [ ] **Step 5: End-to-end first-run check**

In the app (`npm run dev`), Settings → Language → Norsk bokmål, then from the vault picker use “Reset welcome vault” / download welcome vault. Expected: Norwegian welcome notes open.

---

### Task 7: Release v1.0.13

**Files:**
- Modify: `meridian/package.json` (version)
- Modify: `CHANGELOG.md`

- [ ] **Step 1: Sync and verify clean state**

```bash
cd ~/Desktop/dev/new\ project
git pull --ff-only && git status -sb
npm run typecheck && npm run lint && npm run test --prefix meridian
```

Expected: up to date, clean tree except planned changes, all checks green. Note: untracked `meridian-site/` and `site-mockups/` at repo root are separate repos — leave them.

- [ ] **Step 2: Bump version and changelog**

In `meridian/package.json` set `"version": "1.0.13"` (verify current value first — local was 1.0.11 before the pull; releases are at 1.0.12).
Add to `CHANGELOG.md` following its existing format:

```markdown
## 1.0.13 — 2026-06-10

### Added
- Norwegian bokmål (nb) interface language
- Norwegian welcome vault (macOS and Windows)
```

- [ ] **Step 3: Commit and push main**

```bash
git add meridian/package.json CHANGELOG.md
git commit -m "release: v1.0.13 Norwegian bokmål localization"
git push origin main
```

- [ ] **Step 4: Tag and push the tag**

```bash
git tag v1.0.13
git push origin v1.0.13
```

The `meridian-release.yml` workflow triggers on `v*.*.*` tags. Watch: `gh run watch --repo avedevelop/meridian` (or check Actions tab).

- [ ] **Step 5: Verify release assets**

Run: `gh release view v1.0.13 --repo bvsmma/meridian --json assets -q '.assets[].name'`
Expected: `Meridian-1.0.13-arm64.dmg`, `Meridian-1.0.13-x64.dmg`, `Meridian-1.0.13-windows-x64.exe`.

- [ ] **Step 6: Push the site and verify deploy**

```bash
cd ~/Desktop/dev/new\ project/meridian-site
git push origin main
```

The release also triggers `trigger-site-rebuild.yml`. After deploy, open `https://mrd.avetool.cc/no` — bokmål landing, install instructions visible, download buttons point at v1.0.13 assets.

- [ ] **Step 7: Final jury walkthrough**

On a clean account/machine if possible: site `/no` → download → install per on-site instructions → first launch → switch to Norsk bokmål (or verify auto-detect if OS is Norwegian) → welcome vault in Norwegian. Any friction found = fix before submission.
