import FontFaceObserver from 'fontfaceobserver'
import { BitmapFont, IBitmapTextStyle, TextStyle } from 'pixi.js'
import { getTimelineStyles } from './timelineStyles'
import { TextStyles } from '@/models'


function initBitmapFonts(): Promise<TextStyles> {
  const timelineStyles = getTimelineStyles()
  const devicePixelRatio = window.devicePixelRatio || 2

  const fontFamily = timelineStyles.get('--gt-text-font-default')?.toString().split(',')[0] ?? 'sans-serif',
    fontSizeDefault = Number(timelineStyles.get('--gt-text-size-default') ?? 16),
    lineHeightDefault = Number(timelineStyles.get('--gt-text-line-height-default') ?? 1.5) * fontSizeDefault,
    fontSizeSmall = Number(timelineStyles.get('--gt-text-size-small') ?? 14),
    lineHeightSmall = Number(timelineStyles.get('--gt-text-line-height-small') ?? 1.25) * fontSizeDefault,
    colorDefault = timelineStyles.get('--gt-text-color-default') ?? 0x111827,
    colorInverse = timelineStyles.get('--gt-color-text-inverse') ?? 0xffffff

  const nodeTextStyles = new TextStyle({
    fontFamily,
    fontSize: fontSizeDefault,
    lineHeight: lineHeightDefault,
  })

  const timelineMarkerStyles = new TextStyle({
    fontFamily,
    fontSize: fontSizeSmall,
    lineHeight: lineHeightSmall,
  })

  return new Promise((resolve) => {
    const font = new FontFaceObserver(fontFamily)

    font.load().then(() => {
      const options = {
        resolution: devicePixelRatio,
        chars: BitmapFont.ASCII,
      }
      BitmapFont.from(
        'NodeTextDefault',
        {
          ...nodeTextStyles,
          fill: colorDefault,
        }, options,
      )
      BitmapFont.from(
        'NodeTextInverse',
        {
          ...nodeTextStyles,
          fill: colorInverse,
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
        fontSize: fontSizeDefault,
      }

      const nodeTextInverse: Partial<IBitmapTextStyle> = {
        fontName: 'NodeTextInverse',
        fontSize: fontSizeDefault,
      }

      const timeMarkerLabel: Partial<IBitmapTextStyle> = {
        fontName: 'TimeMarkerLabel',
        fontSize: fontSizeSmall,
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
