import FontFaceObserver from 'fontfaceobserver'
import { BitmapFont, IBitmapTextStyle, TextStyle } from 'pixi.js'
import { TextStyles } from '@/models'

// don't remove the empty space in the font sprite keys
const fontSpriteKeys = [
  '0123456789',
  'abcdefghijklmnopqrstuvwxyz',
  'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  ' .,:;!?()[]{}<>|/\\@\'"',
].join('')

export const nodeTextStyles = new TextStyle({
  fontFamily: 'InterVariable',
  fontSize: 14,
  lineHeight: 20,
})

export const timelineMarkerStyles = new TextStyle({
  fontFamily: 'InterVariable',
  fontSize: 12,
  lineHeight: 16,
})

function initBitmapFonts(): Promise<TextStyles> {
  const devicePixelRatio = window.devicePixelRatio || 2

  return new Promise((resolve) => {
    const font = new FontFaceObserver('InterVariable')

    font.load().then(() => {
      const options = {
        resolution: devicePixelRatio,
        chars: fontSpriteKeys,
      }
      BitmapFont.from(
        'NodeTextDefault',
        {
          ...nodeTextStyles,
          fill: 0x111827,
        }, options,
      )
      BitmapFont.from(
        'NodeTextInverse',
        {
          ...nodeTextStyles,
          fill: 0xffffff,
        }, options,
      )
      BitmapFont.from(
        'TimeMarkerLabel',
        {
          ...timelineMarkerStyles,
          fill: 0x94A3B8,
        }, options,
      )

      const nodeTextDefault: Partial<IBitmapTextStyle> = {
        fontName: 'NodeTextDefault',
        fontSize: 14,
      }

      const nodeTextInverse: Partial<IBitmapTextStyle> = {
        fontName: 'NodeTextInverse',
        fontSize: 14,
      }

      const timeMarkerLabel: Partial<IBitmapTextStyle> = {
        fontName: 'TimeMarkerLabel',
        fontSize: 12,
      }

      resolve({
        nodeTextDefault,
        nodeTextInverse,
        timeMarkerLabel,
      })
    })
  })
}

let bitmapFontsCache: Promise<TextStyles> | null = null

export const getBitmapFonts = (): Promise<TextStyles> => {
  if (!bitmapFontsCache) {
    bitmapFontsCache = initBitmapFonts()
  }
  return bitmapFontsCache
}
