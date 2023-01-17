import { IBitmapTextStyle, TextStyle } from 'pixi.js'
import { formatDate, formatDateByMinutes, formatDateBySeconds } from '@/utilities'

export type TimelineNodeData = {
  id: string,
  label: string,
  start: Date,
  end: Date | null,
  upstreamDependencies?: TimelineNodeData[],
  state: string,
}

export type XScale = (date: Date) => number
export type DateScale = (xPosition: number) => number

export type TextStyles = {
  nodeTextDefault: Partial<IBitmapTextStyle>,
  nodeTextInverse: Partial<IBitmapTextStyle>,
  nodeTextStyles: TextStyle,
  timeMarkerLabel: Partial<IBitmapTextStyle>,
}

type FormatDate = (date: Date) => string

export type FormatDateFns = {
  timeBySeconds: FormatDate,
  timeByMinutes: FormatDate,
  date: FormatDate,
}
export const formatDateFnsDefault: FormatDateFns = {
  timeBySeconds: formatDateBySeconds,
  timeByMinutes: formatDateByMinutes,
  date: formatDate,
}

type NodeThemeOptions = {
  fill: string,
  // If your fill is a dark color, set inverse to true. Unless using dark mode text colors.
  inverseTextOnFill: boolean,
}
export type NodeThemeFn = (node: TimelineNodeData) => NodeThemeOptions
export const nodeThemeFnDefault: NodeThemeFn = () => {
  return {
    fill: 'black',
    inverseTextOnFill: true,
  }
}

type Sizing = `${string}px` | `${string}em` | `${string}rem`

type RGB = `rgb(${number}, ${number}, ${number})`
type RGBA = `rgba(${number}, ${number}, ${number}, ${number})`
type HEX = `#${string}`
type Color = RGB | RGBA | HEX

export type ThemeStyleOverrides = {
  colorGraphBg?: Color,
  colorTextDefault?: Color,
  colorTextInverse?: Color,
  colorTextSubdued?: Color,
  colorGuideLine?: Color,
  colorPlayheadBg?: Color,
  textFontFamilyDefault?: string,
  textSizeDefault?: Sizing,
  textSizeSmall?: Sizing,
  textLineHeightDefault?: Sizing,
  textLineHeightSmall?: Sizing,
  spacingViewportPaddingDefault?: Sizing,
  spacingNodeXPadding?: Sizing,
  spacingNodeYPadding?: Sizing,
  spacingNodeMargin?: Sizing,
  spacingNodeLabelMargin?: Sizing,
  spacingGuideLabelPadding?: Sizing,
  spacingPlayheadWidth?: Sizing,
  spacingPlayheadGlowPadding?: Sizing,
  borderRadiusGraph?: Sizing,
  borderRadiusNode?: Sizing,
}

export type ParsedThemeStyles = {
  colorGraphBg: string,
  colorTextDefault: number,
  colorTextInverse: number,
  colorTextSubdued: number,
  colorGuideLine: number,
  colorPlayheadBg: number,
  textFontFamilyDefault: string,
  textSizeDefault: number,
  textSizeSmall: number,
  textLineHeightDefault: number,
  textLineHeightSmall: number,
  spacingViewportPaddingDefault: number,
  spacingNodeXPadding: number,
  spacingNodeYPadding: number,
  spacingNodeMargin: number,
  spacingNodeLabelMargin: number,
  spacingGuideLabelPadding: number,
  spacingPlayheadWidth: number,
  spacingPlayheadGlowPadding: number,
  borderRadiusGraph: string,
  borderRadiusNode: number,
}

export type TimelineThemeOptions = {
  node?: NodeThemeFn,
  defaults?: ThemeStyleOverrides,
}

export type ParsedThemeOptions = {
  node: NodeThemeFn,
  defaults: ParsedThemeStyles,
}
