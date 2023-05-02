import { addMilliseconds } from 'date-fns'
import { Viewport } from 'pixi-viewport'
import { Application, Container } from 'pixi.js'
import { Guide } from '@/containers/guide'
import { FormatDateFns, ParsedThemeStyles } from '@/models/FlowRunTimeline'
import { timelineScale } from '@/pixiFunctions'
import { TimeSpan, getLabelFormatter, getTimeSpanSlot } from '@/utilities'

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

const GUIDE_GAP_PIXELS = 260
const VIEWPORT_BUFFER = 200

export class Guides extends Container {
  private readonly application: Application
  private readonly formatters: FormatDateFns
  private readonly viewport: Viewport
  private readonly styles: ParsedThemeStyles
  private previousViewportLeft: number
  private previousViewportRight: number
  private readonly guides: Guide[] = []

  public constructor({
    application,
    formatters,
    viewport,
    styles,
  }: GuidesArgs) {
    super()

    this.application = application
    this.formatters = formatters
    this.viewport = viewport
    this.styles = styles

    this.previousViewportLeft = this.viewport.left
    this.previousViewportRight = this.viewport.right

    this.application.ticker.add(this.tick)

    this.interactive = false
  }

  public destroy(): void {
    this.application.ticker.remove(this.tick)

    super.destroy.call(this)
  }

  private readonly tick = (): void => {
    const { left, right } = this.viewport

    if (this.previousViewportLeft === left && this.previousViewportRight === right) {
      return
    }

    this.previousViewportLeft = left
    this.previousViewportRight = right

    this.updateGuides()
  }

  private getViewportDates(): ViewportDates {
    const startDate = timelineScale.xToDate(this.viewport.left - VIEWPORT_BUFFER)
    const endDate = timelineScale.xToDate(this.viewport.right + VIEWPORT_BUFFER)
    const span = endDate.getTime() - startDate.getTime()

    return { startDate, endDate, span }
  }

  private getTimeSpan(): TimeSpan {
    const width = this.application.screen.width + VIEWPORT_BUFFER * 2
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

    return dates
  }

  private updateGuides(): void {
    const dates = this.getGuideDates()
    const unused = this.guides.splice(dates.length)

    dates.forEach((date, index) => this.updateOrCreateGuide(index, date))

    this.removeGuides(unused)
  }

  private updateOrCreateGuide(index: number, date: Date): Guide {
    const { application, viewport, styles } = this
    const { labelFormat } = this.getTimeSpan()
    const format = getLabelFormatter(labelFormat, this.formatters)
    const existing = this.guides.at(index)
    const guide = existing ?? new Guide({ application, viewport, styles })

    guide.setDate(date)
    guide.setFormat(format)
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