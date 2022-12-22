import FontFaceObserver from 'fontfaceobserver'
import { BitmapFont, IBitmapTextStyle, TextStyle } from 'pixi.js'
import { TextStyles } from '@/models'

const fontSpriteKeys = [
  '0123456789',
  'abcdefghijklmnopqrstuvwxyz',
  'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  '.,:;!?()[]{}<>|/\\@\'"',
].join('')

const nodeTextStyles = new TextStyle({
  fontFamily: 'InterVariable',
  fontSize: 24,
  lineHeight: 32,
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
          fontFamily: 'InterVariable',
          fontSize: 16,
          lineHeight: 24,
          fill: 0x94A3B8,
        }, options,
      )

      const nodeTextDefault: Partial<IBitmapTextStyle> = {
        fontName: 'NodeTextDefault',
        fontSize: 24,
      }

      const nodeTextInverse: Partial<IBitmapTextStyle> = {
        fontName: 'NodeTextInverse',
        fontSize: 24,
      }

      const timeMarkerLabel: Partial<IBitmapTextStyle> = {
        fontName: 'TimeMarkerLabel',
        fontSize: 12,
      }

      resolve({
        nodeTextDefault,
        nodeTextInverse,
        nodeTextMetrics: nodeTextStyles,
        timeMarkerLabel,
      })
    })
  })
}

export const getBitmapFonts = (): Promise<TextStyles> => {
  return initBitmapFonts()
}
