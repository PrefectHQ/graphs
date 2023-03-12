import type { Viewport } from 'pixi-viewport'
import type { Application, IBitmapTextStyle, TextStyle } from 'pixi.js'
import type { ComputedRef } from 'vue'
import { formatDate, formatDateByMinutes, formatDateBySeconds } from '@/utilities'

export type TimelineNodeData = {
  id: string,
  label: string,
  start: Date,
  end: Date | null,
  state: string,
  upstreamDependencies?: string[],
  subFlowId?: string,
}

export type InitTimelineScaleProps = {
  minimumStartTime: number,
  overallGraphWidth: number,
  initialOverallTimeSpan: number,
}

export type TimelineNodesLayoutOptions = 'waterfall' | 'nearestParent'

export type ExpandedSubNodes = Map<string, TimelineNodeData[]>

export type NodeShoveDirection = 1 | -1
export type NodeLayoutWorkerProps = {
  data: {
    layoutSetting?: TimelineNodesLayoutOptions,
    graphData?: string,
    apxCharacterWidth?: number,
    spacingMinimumNodeEdgeGap?: number,
    timeScaleProps?: InitTimelineScaleProps,
    centerViewportAfter?: boolean,
  },
}
export type NodeLayoutItem = {
  position: number,
  nextDependencyShove?: NodeShoveDirection,
  startX: number,
  endX: number,
}
export type NodesLayout = Record<string, NodeLayoutItem>

export type NodeLayoutRow = { yPos: number, height: number }

export type NodeLayoutWorkerResponseData = {
  layout: NodesLayout,
  centerViewportAfter?: boolean,
}
export type NodeLayoutWorkerResponse = {
  data: NodeLayoutWorkerResponseData,
}

export type GraphState = {
  pixiApp: Application,
  viewport: Viewport,
  timeScaleProps: InitTimelineScaleProps,
  styleOptions: ComputedRef<ParsedThemeStyles>,
  styleNode: ComputedRef<NodeThemeFn>,
  layoutSetting: ComputedRef<TimelineNodesLayoutOptions>,
  hideEdges: ComputedRef<boolean>,
  selectedNodeId: ComputedRef<string | null>,
  expandedSubNodes: ComputedRef<ExpandedSubNodes>,
  suppressMotion: ComputedRef<boolean>,
  centerViewport: (options?: CenterViewportOptions) => void,
}

export type DateToX = (date: Date) => number
export type XToDate = (xPosition: number) => number
export type TimelineScale = {
  dateToX: DateToX,
  xToDate: XToDate,
}

export type CenterViewportOptions = {
  skipAnimation?: boolean,
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
  // for the SubNode toggle buttons
  onFillSubNodeToggleHoverBg: string,
  onFillSubNodeToggleHoverBgAlpha: number,
}
export type NodeThemeFn = (node: TimelineNodeData) => NodeThemeOptions
export const nodeThemeFnDefault: NodeThemeFn = () => {
  return {
    fill: 'black',
    inverseTextOnFill: true,
    onFillSubNodeToggleHoverBg: 'black',
    onFillSubNodeToggleHoverBgAlpha: 0.4,
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
  colorButtonBg?: Color,
  colorButtonBgHover?: Color,
  colorButtonBorder?: Color,
  colorEdge?: Color,
  colorGuideLine?: Color,
  colorPlayheadBg?: Color,
  textFontFamilyDefault?: string,
  textSizeDefault?: Sizing,
  textSizeSmall?: Sizing,
  textLineHeightDefault?: Sizing,
  textLineHeightSmall?: Sizing,
  spacingButtonBorderWidth?: Sizing,
  spacingViewportPaddingDefault?: Sizing,
  spacingNodeXPadding?: Sizing,
  spacingNodeYPadding?: Sizing,
  spacingNodeMargin?: Sizing,
  spacingNodeLabelMargin?: Sizing,
  spacingMinimumNodeEdgeGap?: Sizing,
  spacingNodeEdgeLength?: Sizing,
  spacingNodeSelectionMargin?: Sizing,
  spacingNodeSelectionWidth?: Sizing,
  spacingSubNodesOutlineBorderWidth?: Sizing,
  spacingSubNodesOutlineOffset?: Sizing,
  spacingEdgeWidth?: Sizing,
  spacingGuideLabelPadding?: Sizing,
  spacingPlayheadWidth?: Sizing,
  spacingPlayheadGlowPadding?: Sizing,
  borderRadiusNode?: Sizing,
  borderRadiusButton?: Sizing,
  alphaNodeDimmed?: number,
  alphaSubNodesOutlineDimmed?: number,
}

export type ParsedThemeStyles = {
  colorTextDefault: number,
  colorTextInverse: number,
  colorTextSubdued: number,
  colorNodeSelection: number,
  colorButtonBg: number,
  colorButtonBgHover: number,
  colorButtonBorder: number,
  colorEdge: number,
  colorGuideLine: number,
  colorPlayheadBg: number,
  textFontFamilyDefault: string,
  textSizeDefault: number,
  textSizeSmall: number,
  textLineHeightDefault: number,
  textLineHeightSmall: number,
  spacingButtonBorderWidth: number,
  spacingViewportPaddingDefault: number,
  spacingNodeXPadding: number,
  spacingNodeYPadding: number,
  spacingNodeMargin: number,
  spacingNodeLabelMargin: number,
  spacingMinimumNodeEdgeGap: number,
  spacingNodeEdgeLength: number,
  spacingNodeSelectionMargin: number,
  spacingNodeSelectionWidth: number,
  spacingSubNodesOutlineBorderWidth: number,
  spacingSubNodesOutlineOffset: number,
  spacingEdgeWidth: number,
  spacingGuideLabelPadding: number,
  spacingPlayheadWidth: number,
  spacingPlayheadGlowPadding: number,
  borderRadiusNode: number,
  borderRadiusButton: number,
  alphaNodeDimmed: number,
  alphaSubNodesOutlineDimmed: number,
}

export type TimelineThemeOptions = {
  node?: NodeThemeFn,
  defaults?: ThemeStyleOverrides,
}

export type ParsedThemeOptions = {
  node: NodeThemeFn,
  defaults: ParsedThemeStyles,
}
