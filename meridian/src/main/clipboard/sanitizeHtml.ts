import { unified } from 'unified'
import rehypeParse from 'rehype-parse'
import rehypeSanitize from 'rehype-sanitize'
import rehypeStringify from 'rehype-stringify'

const processor = unified()
  .use(rehypeParse, { fragment: true })
  .use(rehypeSanitize)
  .use(rehypeStringify)

/** Sanitize clipboard HTML before it is stored or ever shown. Scripts, handlers and unsafe URLs are dropped. */
export function sanitizeClipboardHtml(html: string): string {
  if (!html) return ''
  return String(processor.processSync(html))
}
