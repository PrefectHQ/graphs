import FontFaceObserver from 'fontfaceobserver'
import { BitmapFont, IBitmapTextStyle, TextStyle } from 'pixi.js'
import { TextStyles, ParsedThemeStyles } from '@/models'

function loadBitmapFonts(styles: ParsedThemeStyles): Promise<TextStyles> {
  return new Promise((resolve) => {
    const font = new FontFaceObserver(styles.textFontFamilyDefault)

    font.load().then(() => {
      resolve(createBitmapFonts(styles.textFontFamilyDefault, styles))
    }).catch((err) => {
      console.error(`initBitmapFonts: font ${styles.textFontFamilyDefault} failed to load, falling back to sans-serif`, err)
      resolve(createBitmapFonts('sans-serif', styles))
    })
  })
}

function createBitmapFonts(fontFamily: string, styles: ParsedThemeStyles): TextStyles {
  const options = {
    resolution: window.devicePixelRatio || 2,
    chars: BitmapFont.ASCII,
  }

  const nodeTextStyles = new TextStyle({
    fontFamily: fontFamily,
    fontSize: styles.textSizeDefault,
    lineHeight: styles.textLineHeightDefault,
  })

  const timelineMarkerStyles = new TextStyle({
    fontFamily: fontFamily,
    fontSize: styles.textSizeSmall,
    lineHeight: styles.textLineHeightSmall,
  })

  BitmapFont.from(
    'NodeTextDefault',
    {
      ...nodeTextStyles,
      fill: styles.colorTextDefault,
    }, options,
  )
  const nodeTextDefault: Partial<IBitmapTextStyle> = {
    fontName: 'NodeTextDefault',
    fontSize: styles.textSizeDefault,
  }

  BitmapFont.from(
    'NodeTextInverse',
    {
      ...nodeTextStyles,
      fill: styles.colorTextInverse,
    }, options,
  )
  const nodeTextInverse: Partial<IBitmapTextStyle> = {
    fontName: 'NodeTextInverse',
    fontSize: styles.textSizeDefault,
  }

  BitmapFont.from(
    'TimeMarkerLabel',
    {
      ...timelineMarkerStyles,
      fill: styles.colorTextSubdued,
    }, options,
  )
  const timeMarkerLabel: Partial<IBitmapTextStyle> = {
    fontName: 'TimeMarkerLabel',
    fontSize: styles.textSizeSmall,
  }

  return {
    nodeTextDefault,
    nodeTextInverse,
    nodeTextStyles,
    timeMarkerLabel,
  }
}

let bitmapFontsCache: Promise<TextStyles> | null = null

export const getBitmapFonts = (styles: ParsedThemeStyles): Promise<TextStyles> => {
  // NOTE: Once fonts are cached, they are not reactive.
  // If you change the theme, you must refresh the timeline for updated fonts.
  if (!bitmapFontsCache) {
    bitmapFontsCache = loadBitmapFonts(styles)
  }
  return bitmapFontsCache
}
