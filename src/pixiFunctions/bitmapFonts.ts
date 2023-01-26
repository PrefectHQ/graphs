import FontFaceObserver from 'fontfaceobserver'
import { BitmapFont, IBitmapTextStyle, TextStyle } from 'pixi.js'
import { TextStyles, ParsedThemeStyles } from '@/models'

let bitmapFontsFontFamily = 'sans-serif'
let bitmapFontsCache: Promise<TextStyles> | null = null

const nodeTextStyles = new TextStyle()
const baseOptions = {
  chars: BitmapFont.ASCII,
}
const timelineMarkerStyles = new TextStyle()

async function loadBitmapFonts(styles: ParsedThemeStyles): Promise<TextStyles> {
  const font = new FontFaceObserver(styles.textFontFamilyDefault)

  try {
    await font.load()
  } catch (error) {
    console.error(error)
    console.warn(`loadBitmapFonts: font ${styles.textFontFamilyDefault} failed to load, falling back to ${bitmapFontsFontFamily}`)
    return createBitmapFonts(bitmapFontsFontFamily, styles)
  }

  bitmapFontsFontFamily = styles.textFontFamilyDefault
  return createBitmapFonts(bitmapFontsFontFamily, styles)
}

function assignTextStyles(styles: ParsedThemeStyles): void {
  nodeTextStyles.fontFamily = bitmapFontsFontFamily
  nodeTextStyles.fontSize = styles.textSizeDefault
  nodeTextStyles.lineHeight = styles.textLineHeightDefault

  timelineMarkerStyles.fontFamily = bitmapFontsFontFamily
  timelineMarkerStyles.fontSize = styles.textSizeSmall
  timelineMarkerStyles.lineHeight = styles.textLineHeightSmall
}

function createBitmapFonts(fontFamily: string, styles: ParsedThemeStyles): TextStyles {
  assignTextStyles(styles)

  const options = {
    resolution: window.devicePixelRatio || 2,
    ...baseOptions,
  }

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

export function updateBitmapFonts(styles: ParsedThemeStyles): void {
  assignTextStyles(styles)

  const options = {
    resolution: window.devicePixelRatio || 2,
    ...baseOptions,
  }

  setTimeout(() => {
    BitmapFont.uninstall('NodeTextDefault')
    BitmapFont.from(
      'NodeTextDefault',
      {
        ...nodeTextStyles,
        fill: styles.colorTextDefault,
      }, options,
    )

    BitmapFont.uninstall('NodeTextInverse')
    BitmapFont.from(
      'NodeTextInverse',
      {
        ...nodeTextStyles,
        fill: styles.colorTextInverse,
      }, options,
    )

    BitmapFont.uninstall('TimeMarkerLabel')
    BitmapFont.from(
      'TimeMarkerLabel',
      {
        ...timelineMarkerStyles,
        fill: styles.colorTextSubdued,
      }, options,
    )
  }, 0)
}

export const getBitmapFonts = (styles: ParsedThemeStyles): Promise<TextStyles> | TextStyles => {
  if (!bitmapFontsCache) {
    bitmapFontsCache = loadBitmapFonts(styles)
  }

  return bitmapFontsCache
}

export const initBitmapFonts = (styles: ParsedThemeStyles): void => {
  bitmapFontsCache = loadBitmapFonts(styles)
}
