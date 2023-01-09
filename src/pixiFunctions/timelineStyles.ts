import { getStyleVariablesMap, StyleVariablesMap } from '@/utilities'

let timelineStyles: StyleVariablesMap | null = null

export const getTimelineStyles = (): StyleVariablesMap => {
  if (!timelineStyles) {
    timelineStyles = getStyleVariablesMap('gt')
  }

  return timelineStyles
}
