import { Assets, BitmapText, IBitmapTextStyle } from 'pixi.js'
import { emitter, waitForEvent } from '@/objects/events'

let loaded = false

const fonts = {
  inter: fontFactory('Inter-Regular'),
} as const

export type Fonts = typeof fonts

export async function startFonts(): Promise<void> {
  await Assets.load('/fonts/Inter-Regular.fnt')

  loaded = true
  emitter.emit('fontsLoaded', fonts)
}

export function stopFonts(): void {
  loaded = false
}

export async function waitForFonts(): Promise<Fonts> {
  if (loaded) {
    return fonts
  }

  return await waitForEvent('fontsLoaded')
}

function fontFactory(fontName: string) {
  return (text: string, styles: Partial<IBitmapTextStyle>) => {
    return new BitmapText(text, {
      ...styles,
      fontName,
    })
  }
}