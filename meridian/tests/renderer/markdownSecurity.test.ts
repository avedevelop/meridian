import { describe, it, expect } from 'vitest'
import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkGfm from 'remark-gfm'
import remarkBreaks from 'remark-breaks'
import remarkRehype from 'remark-rehype'
import rehypeRaw from 'rehype-raw'
import rehypeSanitize from 'rehype-sanitize'
import rehypeStringify from 'rehype-stringify'
import { postprocessWikiLinks } from '../../src/renderer/src/components/Editor/markdownUtils'

const sanitize = (md: string): string =>
  String(
    unified()
      .use(remarkParse)
      .use(remarkGfm)
      .use(remarkBreaks)
      .use(remarkRehype, { allowDangerousHtml: true })
      .use(rehypeRaw)
      .use(rehypeSanitize)
      .use(rehypeStringify)
      .processSync(md)
  )

// Same order as the preview: sanitize first, then wiki-link postprocessing.
const render = (md: string): HTMLElement => {
  const host = document.createElement('div')
  host.innerHTML = postprocessWikiLinks(sanitize(md), [])
  return host
}

const hasInlineHandler = (root: HTMLElement): boolean =>
  Array.from(root.querySelectorAll('*')).some((el) =>
    el.getAttributeNames().some((n) => n.toLowerCase().startsWith('on'))
  )

describe('postprocessWikiLinks does not allow attribute injection', () => {
  const payloads = [
    '![[x" onerror="alert(1)//.png]]',
    "![[x' onerror='alert(1)//.png]]",
    '![[a.png|" onerror="alert(1)]]',
    '![[x" onmouseover="alert(1)//.excalidraw]]',
    '[[x" onclick="alert(1)]]',
    '[[x|" onclick="alert(1)]]',
    '![[<img src=x onerror=alert(1)>.png]]'
  ]

  for (const payload of payloads) {
    it(`neutralises ${payload}`, () => {
      expect(hasInlineHandler(render(payload))).toBe(false)
    })
  }

  it('keeps existing entities in labels readable', () => {
    const root = render('[[Tom &amp; Jerry]]')
    expect(root.querySelector('.wiki-link')?.textContent).toBe('Tom & Jerry')
  })
})

import { renderDrawingToSVG } from '../../src/renderer/src/components/Editor/drawingSvg'

describe('renderDrawingToSVG', () => {
  const svgOf = (elements: unknown[]): HTMLElement => {
    const host = document.createElement('div')
    host.innerHTML = `<svg>${renderDrawingToSVG(elements)}</svg>`
    return host
  }

  it('drops markup smuggled through numeric fields', () => {
    const host = svgOf([
      {
        type: 'rectangle',
        x: '0" onload="alert(1)',
        y: 0,
        w: 10,
        h: 10,
        stroke: '#fff',
        fill: 'none'
      },
      {
        type: 'circle',
        x: 1,
        y: 1,
        w: '5"><script>alert(1)</script>',
        stroke: '#fff',
        fill: 'none'
      },
      {
        type: 'pencil',
        points: [
          [0, '1" onmouseover="alert(1)'],
          [2, 3]
        ],
        stroke: '#fff',
        strokeWidth: 2
      },
      {
        type: 'line',
        x: 0,
        y: 0,
        w: 1,
        h: '2" onclick="x',
        stroke: '#fff',
        strokeWidth: '3" onclick="x'
      }
    ])
    expect(hasInlineHandler(host)).toBe(false)
    expect(host.querySelector('script')).toBeNull()
  })

  it('escapes stroke, fill and text content', () => {
    const host = svgOf([
      {
        type: 'text',
        x: 0,
        y: 0,
        text: '<img src=x onerror=alert(1)>',
        stroke: '"/><script>alert(1)</script>',
        strokeWidth: 12
      },
      { type: 'rectangle', x: 0, y: 0, w: 1, h: 1, stroke: '#fff', fill: '" onload="alert(1)' }
    ])
    expect(host.querySelector('img')).toBeNull()
    expect(host.querySelector('script')).toBeNull()
    expect(hasInlineHandler(host)).toBe(false)
    expect(host.querySelector('text')?.textContent).toBe('<img src=x onerror=alert(1)>')
  })

  it('still renders normal drawings', () => {
    const host = svgOf([
      {
        type: 'rectangle',
        x: 10,
        y: 20,
        w: -5,
        h: 8,
        stroke: '#ff0000',
        strokeWidth: 2,
        fill: 'none'
      }
    ])
    const rect = host.querySelector('rect')
    expect(rect?.getAttribute('x')).toBe('5')
    expect(rect?.getAttribute('width')).toBe('5')
    expect(rect?.getAttribute('stroke')).toBe('#ff0000')
  })
})
