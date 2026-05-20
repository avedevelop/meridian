import { markdown, markdownLanguage } from '@codemirror/lang-markdown'
import { languages } from '@codemirror/language-data'
import { oneDark } from '@codemirror/theme-one-dark'
import { keymap, EditorView } from '@codemirror/view'
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands'
import { EditorState } from '@codemirror/state'
import {
  lineNumbers,
  highlightActiveLineGutter,
  highlightSpecialChars,
  drawSelection,
  dropCursor,
  rectangularSelection,
  crosshairCursor,
  highlightActiveLine
} from '@codemirror/view'
import {
  foldGutter,
  indentOnInput,
  syntaxHighlighting,
  defaultHighlightStyle,
  bracketMatching,
  foldKeymap
} from '@codemirror/language'
import { searchKeymap, highlightSelectionMatches } from '@codemirror/search'
import { lintKeymap } from '@codemirror/lint'
import { completionKeymap, closeBrackets, closeBracketsKeymap, autocompletion } from '@codemirror/autocomplete'
import { wikiLinkExtension } from './wikiLinkExtension'
import { makeWikiLinkSource, makeWikiLinkTriggerListener } from './wikiLinkCompletion'
import { imagePasteExtension } from './imagePaste'
import { makeSlashSource } from './slashCommands'
import { livePreviewExtension } from './livePreviewExtension'

function getFontFamilyValue(font: string) {
  switch (font) {
    case 'Georgia':
      return 'Georgia, serif'
    case 'Inter':
      return 'Inter, sans-serif'
    case 'Fira Code':
      return '"Fira Code", monospace'
    case 'JetBrains Mono':
      return '"JetBrains Mono", monospace'
    case 'system-ui':
      return 'system-ui, -apple-system, sans-serif'
    default:
      return 'Georgia, serif'
  }
}

export function createMeridianTheme(
  fontSize: number,
  lineWidth: number,
  readableLineLength: boolean,
  fontFamily: string,
  fontWeight: string,
  lineHeight: number
) {
  return EditorView.theme(
    {
      '&': {
        height: '100%',
        fontSize: `${fontSize}px`,
        backgroundColor: 'var(--bg-tertiary) !important'
      },
      '.cm-scroller': {
        overflow: 'auto',
        fontFamily: getFontFamilyValue(fontFamily),
        fontWeight: fontWeight,
        lineHeight: String(lineHeight)
      },
      '.cm-content': {
        padding: '24px 32px',
        maxWidth: readableLineLength ? `${lineWidth}px` : 'none',
        margin: '0 auto',
        backgroundColor: 'var(--bg-tertiary) !important'
      },
      '.cm-gutters': {
        backgroundColor: 'var(--bg-tertiary) !important',
        borderRight: '1px solid var(--border-color) !important',
        color: 'var(--text-secondary) !important'
      },
      '.cm-activeLine': {
        backgroundColor: 'var(--bg-primary) !important'
      },
      '.cm-activeLineGutter': {
        backgroundColor: 'var(--bg-primary) !important',
        color: 'var(--accent-color) !important'
      },
      '.cm-focused': {
        outline: 'none'
      },
      '.cm-line': {
        padding: '0'
      }
    },
    { dark: true }
  )
}

export function createMarkdownExtensions(
  onChange?: (content: string) => void,
  onLinkClick?: (linkText: string) => void,
  getFileNames?: () => string[],
  fontSize = 15,
  lineWidth = 720,
  readableLineLength = true,
  onImagePaste?: (base64: string, ext: string) => Promise<string | null>,
  lineWrapping = true,
  lineNumbersEnabled = true,
  bracketMatchingEnabled = true,
  closeBracketsEnabled = true,
  fontFamily = 'Georgia',
  fontWeight = '400',
  lineHeight = 1.8,
  slashCommandsEnabled = false,
  livePreviewEnabled = true
) {
  return [
    oneDark,
    createMeridianTheme(fontSize, lineWidth, readableLineLength, fontFamily, fontWeight, lineHeight),
    lineWrapping ? EditorView.lineWrapping : [],
    lineNumbersEnabled ? lineNumbers() : [],
    highlightActiveLineGutter(),
    highlightSpecialChars(),
    history(),
    foldGutter(),
    drawSelection(),
    dropCursor(),
    EditorState.allowMultipleSelections.of(true),
    indentOnInput(),
    syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
    bracketMatchingEnabled ? bracketMatching() : [],
    closeBracketsEnabled ? closeBrackets() : [],
    rectangularSelection(),
    crosshairCursor(),
    highlightActiveLine(),
    highlightSelectionMatches(),
    keymap.of([
      ...closeBracketsKeymap,
      ...defaultKeymap,
      ...searchKeymap,
      ...historyKeymap,
      ...foldKeymap,
      ...completionKeymap,
      ...lintKeymap
    ]),
    markdown({ base: markdownLanguage, codeLanguages: languages }),
    livePreviewEnabled ? livePreviewExtension : [],
    onLinkClick ? wikiLinkExtension(onLinkClick) : [],
    // Single autocompletion with all sources — avoids "Config merge conflict for field override"
    autocompletion({
      override: [
        ...(getFileNames ? [makeWikiLinkSource(getFileNames)] : []),
        ...(slashCommandsEnabled ? [makeSlashSource] : [])
      ],
      activateOnTyping: true,
      closeOnBlur: true,
      maxRenderedOptions: 20
    }),
    getFileNames ? makeWikiLinkTriggerListener() : [],
    onChange
      ? EditorView.updateListener.of((update) => {
          if (update.docChanged) onChange(update.state.doc.toString())
        })
      : [],
    onImagePaste ? imagePasteExtension(onImagePaste) : []
  ]
}
