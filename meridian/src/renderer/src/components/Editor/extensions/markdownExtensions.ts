import { markdown, markdownLanguage } from '@codemirror/lang-markdown'
import { languages } from '@codemirror/language-data'
import { oneDark } from '@codemirror/theme-one-dark'
import { keymap, EditorView } from '@codemirror/view'
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands'
import { EditorState } from '@codemirror/state'
import {
  lineNumbers, highlightActiveLineGutter, highlightSpecialChars,
  drawSelection, dropCursor, rectangularSelection,
  crosshairCursor, highlightActiveLine,
} from '@codemirror/view'
import {
  foldGutter, indentOnInput, syntaxHighlighting,
  defaultHighlightStyle, bracketMatching, foldKeymap,
} from '@codemirror/language'
import { searchKeymap, highlightSelectionMatches } from '@codemirror/search'
import { completionKeymap, closeBrackets, closeBracketsKeymap } from '@codemirror/autocomplete'
import { lintKeymap } from '@codemirror/lint'
import { wikiLinkExtension } from './wikiLinkExtension'
import { wikiLinkCompletion } from './wikiLinkCompletion'

export const meridianTheme = EditorView.theme({
  '&': { height: '100%', fontSize: '15px' },
  '.cm-scroller': { overflow: 'auto', fontFamily: "'Georgia', serif", lineHeight: '1.8' },
  '.cm-content': { padding: '24px 32px', maxWidth: 720, margin: '0 auto' },
  '.cm-focused': { outline: 'none' },
  '.cm-line': { padding: '0' },
}, { dark: true })

export function createMarkdownExtensions(
  onChange?: (content: string) => void,
  onLinkClick?: (linkText: string) => void,
  getFileNames?: () => string[],
) {
  return [
    oneDark,
    meridianTheme,
    lineNumbers(),
    highlightActiveLineGutter(),
    highlightSpecialChars(),
    history(),
    foldGutter(),
    drawSelection(),
    dropCursor(),
    EditorState.allowMultipleSelections.of(true),
    indentOnInput(),
    syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
    bracketMatching(),
    closeBrackets(),
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
      ...lintKeymap,
    ]),
    markdown({ base: markdownLanguage, codeLanguages: languages }),
    onLinkClick ? wikiLinkExtension(onLinkClick) : [],
    getFileNames ? wikiLinkCompletion(getFileNames) : [],
    onChange
      ? EditorView.updateListener.of(update => {
          if (update.docChanged) onChange(update.state.doc.toString())
        })
      : [],
  ]
}
