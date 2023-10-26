import FontFaceObserver from 'fontfaceobserver'
import { BitmapFont, BitmapText, IBitmapTextStyle } from 'pixi.js'
import { emitter, waitForEvent } from '@/objects/events'

const bitmapFontStyles = {
  'nodeTextDefault': {
    fontFamily: 'nodeTextDefault',
    fontSize: 16,
    lineHeight: 20,
    fill: 0xffffff,
  },
}

const defaultFontFamily = 'InterVariable'
const fallbackFontFamily = 'sans-serif'
const options = {
  resolution: 4,
  chars: BitmapFont.ASCII,
}
let loaded = false

type BitmapFonts = keyof typeof bitmapFontStyles
const bitmapFonts = new Map<BitmapFonts, Partial<IBitmapTextStyle>>()

const fonts = {
  nodeTextDefault: fontFactory('nodeTextDefault'),
} as const

export type Fonts = typeof fonts

export async function startFonts(): Promise<void> {
  let fontFamily = defaultFontFamily

  const font = new FontFaceObserver(fontFamily)

  try {
    await font.load()
  } catch (error) {
    console.error(error)
    console.warn(`fonts: font ${fontFamily} failed to load, falling back to ${fallbackFontFamily}`)
    fontFamily = fallbackFontFamily
  }

  for (const [name, style] of Object.entries(bitmapFontStyles)) {
    bitmapFonts.set(name as BitmapFonts, createBitmapFont(style as CreateBitmapFont))
  }

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

function fontFactory(bitmapFont: BitmapFonts) {
  return (text: string) => {
    return new BitmapText(text, bitmapFonts.get(bitmapFont))
  }
}

type CreateBitmapFont = {
  name: BitmapFonts,
  fontFamily: string,
  fontSize: number,
  lineHeight: number,
  fill: number,
}
function createBitmapFont({
  name,
  fontFamily,
  fontSize,
  lineHeight,
  fill,
}: CreateBitmapFont): Partial<IBitmapTextStyle> {
  BitmapFont.from(
    name,
    {
      fontFamily,
      fontSize,
      lineHeight,
      fill,
    },
    options,
  )

  return {
    fontName: name,
    fontSize,
  }
}