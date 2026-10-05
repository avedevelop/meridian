import type { ClipboardImageLike, ClipboardLike } from '../../../src/main/clipboard/watcher'

export interface FakeContent {
  text?: string
  html?: string
  png?: Buffer
  size?: { width: number; height: number }
  /** custom formats, e.g. password manager markers */
  custom?: Record<string, Buffer>
}

export class FakeClipboard implements ClipboardLike {
  content: FakeContent = {}
  set(content: FakeContent): void {
    this.content = content
  }
  availableFormats(): string[] {
    const f: string[] = []
    if (this.content.text) f.push('text/plain')
    if (this.content.html) f.push('text/html')
    if (this.content.png) f.push('image/png')
    return f
  }
  readText(): string {
    return this.content.text ?? ''
  }
  readHTML(): string {
    return this.content.html ?? ''
  }
  readImage(): ClipboardImageLike {
    const c = this.content
    return {
      isEmpty: () => !c.png,
      getSize: () => c.size ?? { width: 1, height: 1 },
      toPNG: () => c.png ?? Buffer.alloc(0)
    }
  }
  has(format: string): boolean {
    return !!this.content.custom && format in this.content.custom
  }
  readBuffer(format: string): Buffer {
    return this.content.custom?.[format] ?? Buffer.alloc(0)
  }
}
