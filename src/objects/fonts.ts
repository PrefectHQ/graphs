import FontFaceObserver from 'fontfaceobserver'
import { BitmapFont, BitmapText, IBitmapTextStyle } from 'pixi.js'
import { DEFAULT_TEXT_RESOLUTION } from '@/consts'
import { emitter, waitForEvent } from '@/objects/events'

type BitmapFontStyle = {
  fontFamily: string,
  fontSize: number,
  lineHeight: number,
  fill: number,
}

const fontStyles = {
  inter: {
    fontFamily: 'InterVariable',
    fontSize: 16,
    lineHeight: 20,
    fill: 0xFFFFFF,
  },
} as const satisfies Record<string, Readonly<BitmapFontStyle>>

const fontOptions = {
  resolution: DEFAULT_TEXT_RESOLUTION,
  chars: BitmapFont.ASCII,
}

const fallbackFontFamily = 'sans-serif'

const fonts = {
  inter: fontFactory(fontStyles.inter),
} as const

let loaded = false

export type Fonts = typeof fonts

export async function startFonts(): Promise<void> {
  const styles = Object.values(fontStyles)

  await Promise.all(styles.map(fontStyle => loadFont(fontStyle)))

  loaded = true

  emitter.emit('fontsLoaded', fonts)
}

async function loadFont(fontStyle: BitmapFontStyle): Promise<void> {
  const { fontFamily: name, ...style } = fontStyle

  const observer = new FontFaceObserver(name)

  try {
    await observer.load()
  } catch (error) {
    console.error(error)
    console.warn(`fonts: font ${name} failed to load, falling back to ${fallbackFontFamily}`)

    BitmapFont.from(name, {
      fontFamily: fallbackFontFamily,
      ...style,
    }, fontOptions)

    return
  }

  BitmapFont.from(name, fontStyle, fontOptions)
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

function fontFactory(style: BitmapFontStyle): (text: string) => BitmapText {
  const { fontFamily: fontName, ...fontStyle } = style

  const bitmapStyle: Partial<IBitmapTextStyle> = {
    fontName,
    ...fontStyle,
  }

  return (text: string) => {
    return new BitmapText(text, bitmapStyle)
  }
}
