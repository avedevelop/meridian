# Contributing to Meridian

Thanks for your interest in contributing! Here's everything you need to know.

## Before You Start

- Check [open issues](https://github.com/avedevelop/meridian/issues) to avoid duplicate work
- For significant changes, open an issue first to discuss the approach
- For bug fixes and small improvements, feel free to open a PR directly

## Development Setup

```bash
git clone https://github.com/avedevelop/meridian.git
cd meridian
npm install
npm run dev        # start in development mode
npm test           # run tests
npm run build:mac  # build macOS stable assets
npm run build:win  # build the Windows installer
```

**Requirements:** Node.js 20+, macOS for macOS packaging, Windows for Windows packaging

## Project Structure

```
src/
  main/        # Electron main process (Node.js) — filesystem, IPC
  preload/     # contextBridge — typed API exposed to renderer
  shared/      # Types shared between main and renderer
  renderer/    # React app — all UI and editor logic
tests/
  main/        # Unit tests for main process modules
  renderer/    # Unit tests for React components and store
docs/
  superpowers/ # Design specs and implementation plans
```

## Coding Standards

- **TypeScript everywhere** — no `any` unless absolutely unavoidable
- **TDD** — write a failing test first, then implement
- **Small focused files** — if a file grows past ~200 lines, consider splitting
- **No comments explaining what the code does** — only why (non-obvious constraints, workarounds)

## Testing

```bash
npm test              # run all tests once
npm run test:watch    # watch mode during development
```

Every new feature or bug fix needs a test. Component tests use `@testing-library/react`. Main-process tests use Vitest with mocked `fs`.

## Commit Messages

Use [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add wiki-link autocomplete
fix: file tree not refreshing after rename
chore: update dependencies
docs: add plugin API documentation
```

## Pull Requests

1. Fork and create a branch from `main`: `git checkout -b feat/my-feature`
2. Make your changes with tests
3. Run `npm test` — all tests must pass
4. Open a PR and fill out the template

## Reporting Bugs

Use the [Bug Report](.github/ISSUE_TEMPLATE/bug_report.md) issue template. Include:
- platform-specific behavior on macOS or Windows
- Steps to reproduce
- Expected vs actual behavior
- Screenshots if relevant

## Requesting Features

Use the [Feature Request](.github/ISSUE_TEMPLATE/feature_request.md) issue template.
Check if it aligns with the [roadmap](README.md#roadmap) first.

## License

By contributing, you agree your contributions will be licensed under the [Apache 2.0 License](LICENSE).
