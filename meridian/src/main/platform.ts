import type { BrowserWindowConstructorOptions } from 'electron'

export function buildWindowOptions(
  platform: NodeJS.Platform,
  size: { width: number; height: number; x?: number; y?: number }
): Pick<
  BrowserWindowConstructorOptions,
  'width' | 'height' | 'x' | 'y' | 'titleBarStyle' | 'backgroundColor'
> {
  return {
    width: size.width,
    height: size.height,
    x: size.x,
    y: size.y,
    titleBarStyle: platform === 'darwin' ? 'hiddenInset' : undefined,
    backgroundColor: '#1a1a1a'
  }
}
