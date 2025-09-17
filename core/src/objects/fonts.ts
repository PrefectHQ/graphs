import FontFaceObserver from 'fontfaceobserver'
import { BitmapFont, BitmapText } from 'pixi.js'
import { DEFAULT_TEXT_RESOLUTION } from '@/consts'
import { emitter, waitForEvent } from '@/objects/events'
import { waitForStyles } from '@/objects/styles'

export type FontFactory = (text: string) => BitmapText

type BitmapFontStyle = {
  fontFamily: string,
  fontSize: number,
  lineHeight: number,
  fill: number,
}

let font: FontFactory | null = null

const fontStyles = {
  fontFamily: 'Inter Variable',
  fontSize: 16,
  lineHeight: 20,
  fill: 0xFFFFFF,
} as const satisfies Readonly<BitmapFontStyle>

const fontOptions = {
  resolution: DEFAULT_TEXT_RESOLUTION,
  chars: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 .,!?-+/():;%&`\'*#=[]"',
}

const fallbackFontFamily = 'sans-serif'

export async function startFonts(): Promise<void> {
  const { font: customFont } = await waitForStyles()

  const styles = {
    ...fontStyles,
    fontFamily: customFont.fontFamily,
  }

  await loadFont(styles, customFont.type)

  font = fontFactory(styles)

  emitter.emit('fontLoaded', font)
}

async function loadFont(fontStyle: BitmapFontStyle, type: 'BitmapFont' | 'WebFont'): Promise<void> {
  const { fontFamily: name, ...style } = fontStyle

  try {
    if (type === 'WebFont') {
      const observer = new FontFaceObserver(name)
      await observer.load()
    } else {
      // BitmapFont.from(name, {
      //   fontFamily: fallbackFontFamily,
      //   ...style,
      // }, fontOptions)
    }
  } catch (error) {
    console.error(error)
    console.warn(`fonts: font ${name} failed to load, falling back to ${fallbackFontFamily}`)

    // BitmapFont.from(name, {
    //   fontFamily: fallbackFontFamily,
    //   ...style,
    // }, fontOptions)

    return
  }

  // BitmapFont.from(name, fontStyle, fontOptions)
}

export function stopFonts(): void {
  font = null
}

export async function waitForFonts(): Promise<FontFactory> {
  if (font) {
    return font
  }

  return await waitForEvent('fontLoaded')
}

function fontFactory(style: BitmapFontStyle): FontFactory {
  const { fontFamily: fontName } = style

  return (text: string) => {
    return new BitmapText(text, {
      fontName,
      fontSize: style.fontSize,
      // tint: style.fill, // tint property not available in TextStyle
    })
  }
}
