import type { VaultFile } from '@shared/types'
import type { MarkdownFormatter } from '../markdownCore'
import { postprocessWikiLinks } from '../../components/Editor/markdownUtils'

export const wikiLinksFormatter: MarkdownFormatter = {
  name: 'wikiLinks',
  postprocessHtml: (html: string, files: VaultFile[]) => postprocessWikiLinks(html, files)
}
