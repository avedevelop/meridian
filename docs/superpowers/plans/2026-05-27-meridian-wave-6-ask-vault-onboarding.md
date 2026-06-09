# Meridian Wave 6: Ask Vault And Onboarding

## Goal

Ship a read-only Ask Vault experience and refresh first-run onboarding so testers can understand the structured Meridian foundation without the app modifying vault files through AI.

## Constraints

- Ask Vault is read-only in this wave.
- Vault files remain local unless the user explicitly configures an external provider in settings.
- The first implementation can answer from local indexed context without requiring a network provider.
- Source notes must be visible for every answer.
- Windows and macOS first-run paths must stay platform-specific and must not show macOS-only UI on Windows.

## Tasks

1. Add shared Ask Vault context helpers.
   - Extract searchable note snippets from Markdown.
   - Include frontmatter properties, note type markers, relationship fields, and saved view names when available.
   - Return cited source notes for every generated response.

2. Add provider and privacy settings.
   - Store provider mode in existing preferences.
   - Default to a local read-only mode.
   - Add clear copy that external providers can receive selected note context only after explicit setup.

3. Add the Ask Vault panel.
   - Add a right-panel tab.
   - Let users ask a question against current local vault context.
   - Show answer, citations, and empty/error states.
   - Do not expose any write action.

4. Refresh onboarding content.
   - Update welcome vault files for macOS and Windows.
   - Demonstrate properties, types/templates, relationships, saved views, Git history, and Ask Vault.
   - Keep content path-safe for spaces and Cyrillic paths.

5. Verify.
   - Run focused tests for Ask Vault context helpers.
   - Run typecheck, lint, test, and build.
   - Smoke-check English/Russian labels and Windows/macOS welcome source paths.

## Out Of Scope

- AI agents that edit notes.
- Background uploads or background external indexing.
- Full provider API integration with billing, streaming, or chat history sync.
- Automatic rewrite of notes based on Ask Vault answers.

## Acceptance Criteria

- Ask Vault can answer from selected local note context.
- Answers cite source notes.
- The UI states that the feature is read-only.
- Provider settings are explicit and understandable.
- Welcome vault content introduces all six waves.
- No push or release is made until the full local wave stack is reviewed.
