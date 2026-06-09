# Meridian Foundation Roadmap Design

## Goal

Define a six-wave product roadmap for Meridian inspired by Tolaria-style knowledge-management ideas, while keeping Meridian Markdown-first, local-first, and distinct from an IDE-style VS Code clone.

This document is a product and architecture design, not an implementation plan. Each wave should later receive its own implementation plan before code changes begin.

## Strategy

Meridian should use a foundation-first roadmap. The app already has useful primitives: Markdown files, YAML/frontmatter display, backlinks, tags, local graph, tasks, calendar, Git panel, plugins, and Electron desktop packaging. The next phase should make the data model reliable before building richer workflows and AI features on top of it.

The roadmap is split into six user-visible waves. Each wave adds enough foundation to support later work, but must also ship a visible improvement that testers can validate.

## Cross-Cutting UI Direction

Meridian should move toward a Soft Utility Workspace:

- Comfortable daily note-taking and knowledge work, not decorative UI.
- Softer separation between app regions through spacing, surfaces, and subtle dividers instead of harsh borders.
- Less IDE chrome: sidebars, tabs, panels, and command surfaces should feel like a knowledge workspace, not a code editor.
- Better reading comfort in editor and preview areas.
- Consistent panel styling across properties, backlinks, tasks, calendar, Git, graph, and Ask Vault.
- Clear empty states and first-run guidance.
- Windows/macOS polish: platform-correct keyboard hints, native menu language, no macOS-only symbols in Windows UI, and reliable layout at smaller window sizes.

Every wave has UI acceptance criteria. New features are not considered complete if they add visual noise, sharp framed panels, inconsistent spacing, or platform-specific artifacts.

## Wave 1: Properties Core

### Purpose

Turn the current frontmatter panel into a dependable foundation for structured notes.

### User-Visible Outcome

The right panel becomes a real properties editor. Users can add and edit properties without raw prompt flows, and changes are saved back to Markdown frontmatter safely.

### Scope

- Replace the simple frontmatter parsing with a YAML-aware utility.
- Preserve Markdown body content and comments where practical.
- Support initial property value types:
  - text
  - number
  - date
  - checkbox
  - tags
  - relation
- Add inline property creation, editing, clearing, and deletion.
- Localize all property UI in English and Russian.
- Add validation and error display for malformed frontmatter.

### Out of Scope

- Full database views.
- Multi-note bulk editing.
- AI field generation.

### Acceptance Criteria

- Existing Markdown files without frontmatter continue to open normally.
- Frontmatter edits do not corrupt note content.
- Russian and English UI labels are complete.
- The panel follows the Soft Utility Workspace direction.
- Unit tests cover parsing, serialization, and common edit operations.

## Wave 2: Types And Templates

### Purpose

Let users create predictable note categories without manually copying YAML blocks.

### User-Visible Outcome

Users can create notes as Project, Person, Daily, Task, or custom types. Each type has a property schema and an optional template.

### Scope

- Add note type metadata stored in frontmatter.
- Define type schemas in a vault-local Meridian config.
- Add template files or template records for each type.
- Add a "Create as..." flow from the file sidebar and command palette.
- Apply default properties when creating a typed note.
- Keep templates editable as Markdown.

### Out of Scope

- Complex formula fields.
- Global cloud template marketplace.
- Plugin-defined type schemas.

### Acceptance Criteria

- Users can create a typed note in one flow.
- Typed note creation works with spaces and Cyrillic paths.
- Type schemas do not break existing untyped notes.
- The create flow feels native on Windows and macOS.
- Tests cover default type application and template insertion.

## Wave 3: Relationships

### Purpose

Make relationships between notes first-class while staying compatible with Markdown links.

### User-Visible Outcome

Users can set relation properties with note autocomplete, inspect related notes, and see more meaningful backlinks/local graph data.

### Scope

- Treat relation properties as structured references to notes.
- Support autocomplete for relation fields.
- Index relation fields alongside wikilinks and tags.
- Add a relationship browser in the right panel or graph-adjacent UI.
- Improve local graph labels and grouping using type and relation metadata.

### Out of Scope

- Arbitrary graph database storage.
- Cloud collaboration.
- Bidirectional relation editing beyond what is stored in Markdown.

### Acceptance Criteria

- Relation fields survive file rename and path normalization where possible.
- Relationship UI explains missing or unresolved notes clearly.
- Existing wikilinks/backlinks continue to work.
- Tests cover relation indexing and unresolved relation behavior.

## Wave 4: Views And Workflows

### Purpose

Turn structured metadata into daily workflows.

### User-Visible Outcome

Users can create saved views such as task lists, project lists, inbox, and daily-note filtered views.

### Scope

- Add saved views with list and table layouts.
- Support filters by type, property, tag, date, task status, and relation.
- Add a lightweight inbox workflow for uncategorized notes.
- Integrate tasks and daily notes with saved views.
- Add view entry points in sidebar and command palette.

### Out of Scope

- Full spreadsheet formulas.
- Kanban as a required first view.
- Cross-vault saved views.

### Acceptance Criteria

- Users can save and reopen a view.
- Views update when files change.
- Tasks and daily notes can be filtered without duplicating data.
- Empty states tell users what to do next.
- UI remains calm and readable at normal and smaller window sizes.

## Wave 5: Git Trust Layer

### Purpose

Make local Git a user-facing safety layer, not only a hidden backup mechanism.

### User-Visible Outcome

Users can inspect history for a note, compare versions, restore a previous version, and understand commit/push state from the UI.

### Scope

- Add per-note history UI.
- Add diff and restore flows.
- Improve commit/push status in the Git panel.
- Surface Git errors in user-readable language.
- Keep all destructive operations explicit and reversible where possible.

### Out of Scope

- Hosted Git account onboarding beyond existing remote setup.
- Conflict-resolution editor for every edge case.
- Automatic remote writes without clear user action.

### Acceptance Criteria

- Restore never silently overwrites dirty tabs.
- Diff is readable in light and dark themes.
- Errors distinguish missing Git, no repository, auth failure, and merge/conflict states.
- Tests cover history lookup and restore guardrails.

## Wave 6: Ask Vault And Onboarding

### Purpose

Add a minimal AI feature that benefits from the structured foundation without allowing risky automatic writes.

### User-Visible Outcome

Users can ask questions about the vault from a read-only Ask Vault panel. New users also get a better Getting Started vault and in-app documentation.

### Scope

- Add provider settings for supported AI backends.
- Build context packs from notes, properties, types, saved views, and relationships.
- Add a read-only Ask Vault panel.
- Show source notes used in answers.
- Add clear privacy and permission language.
- Refresh the sample vault, welcome flow, and onboarding docs to demonstrate properties, types, views, relationships, Git history, and Ask Vault.

### Out of Scope

- Agents that write files.
- Autonomous refactoring of vault content.
- Background indexing that sends content to third parties without explicit configuration.

### Acceptance Criteria

- Ask Vault can answer using selected local context.
- Answers cite source notes or views.
- No vault files are modified by Ask Vault in this wave.
- Provider settings are explicit and understandable.
- The Getting Started vault works on Windows and macOS.

## Architecture Principles

- Markdown remains the source of truth.
- Meridian metadata should be human-readable and vault-local where possible.
- Frontmatter utilities should be isolated and tested before UI layers depend on them.
- Indexing should unify wikilinks, tags, relation fields, tasks, and typed metadata through clear interfaces.
- UI panels should consume structured state rather than parsing Markdown independently.
- Platform-specific behavior should be isolated in main-process or shared platform helpers.

## Testing Strategy

Each wave should include:

- Unit tests for parsing, serialization, indexing, and state utilities.
- Renderer tests for panel behavior and empty states.
- Main-process tests for file, path, Git, and platform-sensitive behavior.
- Manual smoke checks on macOS and Windows release artifacts before publishing.

Release validation should explicitly include:

- English and Russian UI.
- Light and dark themes.
- Paths with spaces and Cyrillic characters.
- Smaller window sizes.
- Windows keyboard hints and native menu language.
- macOS signing and packaging checks.

## Roadmap Order

1. Properties Core
2. Types And Templates
3. Relationships
4. Views And Workflows
5. Git Trust Layer
6. Ask Vault And Onboarding

This order is intentional. Ask Vault depends on structured context. Views depend on properties and types. Relationship browsing depends on relation indexing. Git restore becomes more important once users are editing structured metadata through the UI.

## Success Criteria

The roadmap succeeds if Meridian becomes:

- Easier to use for daily knowledge work.
- More structured without abandoning Markdown.
- Safer to edit because Git history is understandable.
- More visually comfortable and less like an IDE clone.
- Ready for AI features without giving AI unsafe write access too early.
