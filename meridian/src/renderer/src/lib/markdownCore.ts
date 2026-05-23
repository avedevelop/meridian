import type { VaultFile } from '@shared/types'

export interface MarkdownFormatter {
  name: string
  preprocessMd?: (md: string) => string
  postprocessHtml?: (html: string, files: VaultFile[]) => string
}

const registry: MarkdownFormatter[] = []

export function registerFormatter(f: MarkdownFormatter): void {
  registry.push(f)
}

export function applyPreprocessors(md: string): string {
  return registry.reduce((acc, f) => (f.preprocessMd ? f.preprocessMd(acc) : acc), md)
}

export function applyPostprocessors(html: string, files: VaultFile[]): string {
  return registry.reduce(
    (acc, f) => (f.postprocessHtml ? f.postprocessHtml(acc, files) : acc),
    html
  )
}

import { calloutsFormatter } from './markdownCoreFormatters/calloutsFormatter'
registerFormatter(calloutsFormatter)

import { highlightsFormatter } from './markdownCoreFormatters/highlightsFormatter'
registerFormatter(highlightsFormatter)

import { wikiLinksFormatter } from './markdownCoreFormatters/wikiLinksFormatter'
registerFormatter(wikiLinksFormatter)
