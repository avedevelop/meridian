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
import { completionKeymap, closeBrackets, closeBracketsKeymap } from '@codemirror/autocomplete'
import { lintKeymap } from '@codemirror/lint'
import { wikiLinkExtension } from './wikiLinkExtension'
import { wikiLinkCompletion } from './wikiLinkCompletion'
import { imagePasteExtension } from './imagePaste'

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
  fontFamily: string,
  fontWeight: string,
  lineHeight: number
) {
  return EditorView.theme(
    {
      '&': {
        height: '100%',
        fontSize: `${fontSize}px`,
        backgroundColor: '#131313 !important'
      },
      '.cm-scroller': {
        overflow: 'auto',
        fontFamily: getFontFamilyValue(fontFamily),
        fontWeight: fontWeight,
        lineHeight: String(lineHeight)
      },
      '.cm-content': {
        padding: '24px 32px',
        maxWidth: `${lineWidth}px`,
        margin: '0 auto',
        backgroundColor: '#131313 !important'
      },
      '.cm-gutters': {
        backgroundColor: '#131313 !important',
        borderRight: '1px solid #222222 !important',
        color: '#444 !important'
      },
      '.cm-activeLine': {
        backgroundColor: '#1a1a1f !important'
      },
      '.cm-activeLineGutter': {
        backgroundColor: '#1a1a1f !important',
        color: '#7c6af7 !important'
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
  onImagePaste?: (base64: string, ext: string) => Promise<string | null>,
  lineWrapping = true,
  lineNumbersEnabled = true,
  bracketMatchingEnabled = true,
  closeBracketsEnabled = true,
  fontFamily = 'Georgia',
  fontWeight = '400',
  lineHeight = 1.8
) {
  return [
    oneDark,
    createMeridianTheme(fontSize, lineWidth, fontFamily, fontWeight, lineHeight),
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
    onLinkClick ? wikiLinkExtension(onLinkClick) : [],
    getFileNames ? wikiLinkCompletion(getFileNames) : [],
    onChange
      ? EditorView.updateListener.of((update) => {
          if (update.docChanged) onChange(update.state.doc.toString())
        })
      : [],
    onImagePaste ? imagePasteExtension(onImagePaste) : []
  ]
}
