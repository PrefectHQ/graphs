import { IBitmapTextStyle, TextStyle } from 'pixi.js'
import { formatDate, formatDateByMinutes, formatDateBySeconds } from '@/utilities'

export type TimelineNodeData = {
  id: string,
  label: string,
  start: Date,
  end: Date | null,
  upstreamDependencies?: string[],
  state: string,
}

export type InitTimelineScaleProps = {
  minimumStartTime: number,
  overallGraphWidth: number,
  initialOverallTimeSpan: number,
}

export type TimelineNodesLayoutOptions = 'waterfall' | 'nearestParent'

export type NodeShoveDirection = 1 | -1
export type NodeLayoutWorkerProps = {
  data: {
    layoutSetting?: TimelineNodesLayoutOptions,
    graphData: string,
    textMWidth?: number,
    spacingMinimumNodeEdgeGap?: number,
    timeScaleProps?: InitTimelineScaleProps,
  },
}
export type NodeLayoutItem = {
  position: number,
  nextDependencyShove?: NodeShoveDirection,
  startX: number,
  endX: number,
}
export type NodesLayout = Record<string, NodeLayoutItem>
export type NodeLayoutWorkerResponse = {
  data: NodesLayout,
}

export type DateToX = (date: Date) => number
export type XToDate = (xPosition: number) => number
export type TimelineScale = {
  dateToX: DateToX,
  xToDate: XToDate,
}

export type TextStyles = {
  nodeTextDefault: Partial<IBitmapTextStyle>,
  nodeTextInverse: Partial<IBitmapTextStyle>,
  nodeTextStyles: TextStyle,
  timeMarkerLabel: Partial<IBitmapTextStyle>,
  playheadTimerLabel: Partial<IBitmapTextStyle>,
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

export type RGB = `rgb(${number}, ${number}, ${number})`
export type RGBA = `rgba(${number}, ${number}, ${number}, ${number})`
export type HSL = `hsl(${string | number}, ${number | string}, ${number | string})`
export type HEX = `#${string}`
export type Color = RGB | RGBA | HSL | HEX

export type ThemeStyleOverrides = {
  colorTextDefault?: Color,
  colorTextInverse?: Color,
  colorTextSubdued?: Color,
  colorNodeSelection?: Color,
  colorEdge?: Color,
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
  spacingMinimumNodeEdgeGap?: Sizing,
  spacingNodeEdgeLength?: Sizing,
  spacingNodeSelectionMargin?: Sizing,
  spacingNodeSelectionWidth?: Sizing,
  spacingEdgeWidth?: Sizing,
  spacingGuideLabelPadding?: Sizing,
  spacingPlayheadWidth?: Sizing,
  spacingPlayheadGlowPadding?: Sizing,
  borderRadiusNode?: Sizing,
  alphaNodeDimmed?: number,
}

export type ParsedThemeStyles = {
  colorTextDefault: number,
  colorTextInverse: number,
  colorTextSubdued: number,
  colorNodeSelection: number,
  colorEdge: number,
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
  spacingMinimumNodeEdgeGap: number,
  spacingNodeEdgeLength: number,
  spacingNodeSelectionMargin: number,
  spacingNodeSelectionWidth: number,
  spacingEdgeWidth: number,
  spacingGuideLabelPadding: number,
  spacingPlayheadWidth: number,
  spacingPlayheadGlowPadding: number,
  borderRadiusNode: number,
  alphaNodeDimmed: number,
}

export type TimelineThemeOptions = {
  node?: NodeThemeFn,
  defaults?: ThemeStyleOverrides,
}

export type ParsedThemeOptions = {
  node: NodeThemeFn,
  defaults: ParsedThemeStyles,
}
