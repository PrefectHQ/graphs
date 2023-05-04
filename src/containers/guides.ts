import { addMilliseconds } from 'date-fns'
import { Viewport } from 'pixi-viewport'
import { Application, Container } from 'pixi.js'
import { watch } from 'vue'
import { Guide, GuideDateFormatter } from '@/containers/guide'
import { FormatDateFns, GraphState, ParsedThemeStyles } from '@/models/FlowRunTimeline'
import { TimeSpan, getLabelFormatter, getTimeSpanSlot } from '@/utilities'
import { ViewportUpdatedCheck, viewportUpdatedFactory } from '@/utilities/viewport'

export type GuidesArgs = {
  application: Application,
  viewport: Viewport,
  styles: ParsedThemeStyles,
  formatters: FormatDateFns,
}

type ViewportDates = {
  startDate: Date,
  endDate: Date,
  span: number,
}

const MAX_GUIDES = 20
const GUIDE_GAP_PIXELS = 260
const VIEWPORT_BUFFER = 100

export class Guides extends Container {
  private readonly state: GraphState
  private readonly guides: Guide[] = []
  private readonly viewportUpdated: ViewportUpdatedCheck
  private readonly unwatch: ReturnType<typeof watch>

  public constructor(state: GraphState) {
    super()

    this.state = state

    this.viewportUpdated = viewportUpdatedFactory(state.viewport)

    this.state.pixiApp.ticker.add(this.tick)

    this.unwatch = watch([this.state.styleOptions, this.state.formatDateFns], () => {
      this.updateGuides()
    })
  }

  public destroy(): void {
    this.state.pixiApp.ticker.remove(this.tick)
    this.unwatch()

    super.destroy.call(this)
  }

  private readonly tick = (): void => {
    if (!this.viewportUpdated()) {
      return
    }

    this.updateGuides()
  }

  private getViewportDates(): ViewportDates {
    const startDate = this.state.timeScale.xToDate(this.state.viewport.left - VIEWPORT_BUFFER)
    const endDate = this.state.timeScale.xToDate(this.state.viewport.right + VIEWPORT_BUFFER)
    const span = endDate.getTime() - startDate.getTime()

    return { startDate, endDate, span }
  }

  private getTimeSpan(): TimeSpan {
    const width = this.state.pixiApp.screen.width + VIEWPORT_BUFFER * 2
    const numberOfGuides = Math.ceil(width / GUIDE_GAP_PIXELS)
    const { span } = this.getViewportDates()
    const guideSpan = Math.ceil(span / numberOfGuides)

    return getTimeSpanSlot(guideSpan)
  }

  private getFirstGuideDate(startDate: Date, span: number): Date {
    const firstGuideTime = Math.ceil(startDate.getTime() / span) * span

    return new Date(firstGuideTime)
  }

  private getGuideDates(): Date[] {
    const { startDate, endDate } = this.getViewportDates()
    const { span } = this.getTimeSpan()
    const dates = []

    let date = this.getFirstGuideDate(startDate, span)

    if (date.getTime() >= endDate.getTime()) {
      throw new Error('first guide date is equal or after the desired end date')
    }

    while (date.getTime() < endDate.getTime()) {
      dates.push(date)
      date = addMilliseconds(date, span)
    }

    while (dates.length > MAX_GUIDES) {
      dates.shift()
      dates.pop()
    }

    return dates
  }

  private getLabelFormat(): GuideDateFormatter {
    const { labelFormat } = this.getTimeSpan()

    return getLabelFormatter(labelFormat, this.state.formatDateFns.value)
  }

  private updateGuides(): void {
    const dates = this.getGuideDates()
    const unused = this.guides.splice(dates.length)

    dates.forEach((date, index) => this.updateOrCreateGuide(index, date))

    this.removeGuides(unused)
  }

  private updateOrCreateGuide(index: number, date: Date): Guide {
    const existing = this.guides.at(index)
    const guide = existing ?? new Guide(this.state)

    guide.setDate(date)
    guide.setFormat(this.getLabelFormat())

    this.guides[index] = guide

    if (!existing) {
      this.addChild(guide)
    }

    return guide
  }

  private removeGuides(guides: Guide[]): void {
    guides.forEach(guide => {
      guide.destroy()
      this.removeChild(guide)
    })
  }

}