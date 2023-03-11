import { ParsedThemeStyles, ThemeStyleOverrides } from '@/models'
import { max, min, round } from '@/utilities/math'

export function parseThemeOptions(overrides?: ThemeStyleOverrides): ParsedThemeStyles {
  return {
    colorTextDefault: colorToHex(overrides?.colorTextDefault ?? '#374151'),
    colorTextInverse: colorToHex(overrides?.colorTextInverse ?? '#f8fafc'),
    colorTextSubdued: colorToHex(overrides?.colorTextSubdued ?? '#6b7280'),
    colorEdge: colorToHex(overrides?.colorEdge ?? '#374151'),
    colorNodeSelection: colorToHex(overrides?.colorNodeSelection ?? '#024DFD'),
    colorButtonBg: colorToHex(overrides?.colorButtonBg ?? '#ffffff'),
    colorButtonBgHover: colorToHex(overrides?.colorButtonBgHover ?? '#cbd5e1'),
    colorButtonBorder: colorToHex(overrides?.colorButtonBorder ?? '#cbd5e1'),
    colorGuideLine: colorToHex(overrides?.colorGuideLine ?? '#cbd5e1'),
    colorPlayheadBg: colorToHex(overrides?.colorPlayheadBg ?? '#4e82fe'),
    textFontFamilyDefault: overrides?.textFontFamilyDefault ?? 'InterVariable',
    textSizeDefault: spacingToNumber(overrides?.textSizeDefault ?? '14px'),
    textSizeSmall: spacingToNumber(overrides?.textSizeSmall ?? '12px'),
    textLineHeightDefault: spacingToNumber(overrides?.textLineHeightDefault ?? '20px'),
    textLineHeightSmall: spacingToNumber(overrides?.textLineHeightSmall ?? '16px'),
    spacingButtonBorderWidth: spacingToNumber(overrides?.spacingButtonBorderWidth ?? '2px'),
    spacingViewportPaddingDefault: spacingToNumber(overrides?.spacingViewportPaddingDefault ?? '40px'),
    spacingNodeXPadding: spacingToNumber(overrides?.spacingNodeXPadding ?? '8px'),
    spacingNodeYPadding: spacingToNumber(overrides?.spacingNodeYPadding ?? '8px'),
    spacingNodeMargin: spacingToNumber(overrides?.spacingNodeMargin ?? '24px'),
    spacingNodeLabelMargin: spacingToNumber(overrides?.spacingNodeLabelMargin ?? '20px'),
    spacingMinimumNodeEdgeGap: spacingToNumber(overrides?.spacingMinimumNodeEdgeGap ?? '16px'),
    spacingNodeEdgeLength: spacingToNumber(overrides?.spacingNodeEdgeLength ?? '8px'),
    spacingNodeSelectionMargin: spacingToNumber(overrides?.spacingNodeSelectionMargin ?? '2px'),
    spacingNodeSelectionWidth: spacingToNumber(overrides?.spacingNodeSelectionWidth ?? '4px'),
    spacingSubNodesOutlineBorderWidth: spacingToNumber(overrides?.spacingSubNodesOutlineBorderWidth ?? '2px'),
    spacingSubNodesOutlineOffset: spacingToNumber(overrides?.spacingSubNodesOutlineOffset ?? '5px'),
    spacingEdgeWidth: spacingToNumber(overrides?.spacingEdgeWidth ?? '2px'),
    spacingGuideLabelPadding: spacingToNumber(overrides?.spacingGuideLabelPadding ?? '4px'),
    spacingPlayheadGlowPadding: spacingToNumber(overrides?.spacingPlayheadGlowPadding ?? '8px'),
    spacingPlayheadWidth: spacingToNumber(overrides?.spacingPlayheadWidth ?? '2px'),
    borderRadiusNode: spacingToNumber(overrides?.borderRadiusNode ?? '8px'),
    borderRadiusButton: spacingToNumber(overrides?.borderRadiusButton ?? '8px'),
    alphaNodeDimmed: overrides?.alphaNodeDimmed ?? 0.2,
    alphaSubNodesOutlineDimmed: overrides?.alphaSubNodesOutlineDimmed ?? 0.7,
  }
}

export function colorToHex(color: string): number {
  const trimmedColor = color.trim()

  if (trimmedColor.startsWith('rgb')) {
    const [red, green, blue] = trimmedColor.replace(/[^\d,]/g, '').split(',').map((val) => parseInt(val, 10))
    return rgb2hex([red, green, blue])
  }

  if (trimmedColor.startsWith('hsl')) {
    const [hue, saturation, lightness] = trimmedColor.replace(/[^\d,.%]/g, '').split(',').map((val) => parseInt(val, 10))
    const val = string2hex(hslToHex(hue, saturation, lightness))
    return val
  }

  return string2hex(trimmedColor)
}

function rgb2hex(rgb: number[] | Float32Array): number {
  return parseInt((1 << 24 | rgb[0] << 16 | rgb[1] << 8 | rgb[2]).toString(16).slice(1), 16)
}

function hslToHex(hue: number, saturation: number, lightness: number): string {
  lightness /= 100
  const alpha = saturation * min(lightness, 1 - lightness) / 100

  const hexValue = (num: number): string => {
    const kar = num + hue as number / 30 % 12
    const color = lightness - alpha * max(min(kar - 3, 9 - kar, 1), -1)
    return round(255 * color).toString(16).padStart(2, '0')
  }

  return `#${hexValue(0)}${hexValue(8)}${hexValue(4)}`
}

function string2hex(string: string): number {
  // @TODO: Once we update to v7, PIXI.utils.string2hex can handle this
  // ticket to update to v7: https://github.com/PrefectHQ/graphs/issues/49
  // lifted from https://github.com/pixijs/pixijs/blob/dev/packages/utils/src/color/hex.ts
  if (typeof string === 'string') {

    if (string.startsWith('#')) {
      string = string.slice(1)
    }

    if (string.length === 3) {
      const [red, green, blue] = string

      string = red + red + green + green + blue + blue
    }
  }

  return parseInt(string, 16)
}

export function spacingToNumber(spacing: string): number {
  if (typeof spacing !== 'string') {
    logSpacingToNumberError(spacing)
    return 0
  }

  if (spacing.endsWith('em') || spacing.endsWith('rem')) {
    return convertRemToNumber(spacing)
  } else if (spacing.endsWith('px')) {
    return parseFloat(spacing)
  }

  logSpacingToNumberError(spacing)
  return 0
}
function logSpacingToNumberError(spacing: string): void {
  console.error(`
    FlowRunTimeline failed to parse spacing style: ${spacing}.
    Make sure to use 'rem', 'em', or 'px' values.
    Defaulting to zero.
  `)
}

function convertRemToNumber(rem: string): number {
  const documentFontSize = getComputedStyle(document.documentElement).fontSize
  return parseFloat(rem) * parseFloat(documentFontSize)
}
