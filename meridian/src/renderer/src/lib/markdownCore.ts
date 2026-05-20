import type { EditorView } from '@codemirror/view'
import type { Decoration } from '@codemirror/view'
import type { VaultFile } from '@shared/types'

export type CmEntry = { from: number; to: number; deco: Decoration }

export interface MarkdownFormatter {
  name: string
  preprocessMd?: (md: string) => string
  postprocessHtml?: (html: string, files: VaultFile[]) => string
  cmDecorations?: (view: EditorView) => CmEntry[]
}

const registry: MarkdownFormatter[] = []

export function registerFormatter(f: MarkdownFormatter): void {
  registry.push(f)
}

export function applyPreprocessors(md: string): string {
  return registry.reduce((acc, f) => (f.preprocessMd ? f.preprocessMd(acc) : acc), md)
}

export function applyPostprocessors(html: string, files: VaultFile[]): string {
  return registry.reduce((acc, f) => (f.postprocessHtml ? f.postprocessHtml(acc, files) : acc), html)
}

export function collectCmDecorations(view: EditorView): CmEntry[] {
  return registry.flatMap((f) => (f.cmDecorations ? f.cmDecorations(view) : []))
}

import { calloutsFormatter } from './markdownCoreFormatters/calloutsFormatter'
registerFormatter(calloutsFormatter)
