import type { Viewport } from 'pixi-viewport'
import { Container } from 'pixi.js'
import type { Application } from 'pixi.js'
import type { Ref } from 'vue'
import { TimelineGuide } from './timelineGuide'
import {
  labelFormats,
  roundDownToNearestDay,
  roundDownToNearestEvenNumberedHour,
  timeLengths,
  timeSpanSlots
} from '@/utilities'

const timelineGuidesMinGap = 260
const timelineGuidesOuterBuffer = 4000

type TimelineGuidesProps = {
  viewportRef: Viewport,
  appRef: Application,
  xScale: (x: Date) => number,
  dateScale: (x: number) => number,
  minimumStartDate: Date,
  maximumEndDate: Ref<Date | undefined>,
  isRunning: boolean,
  formatTimeBySeconds: (date: Date) => string,
  formatTimeByMinutes: (date: Date) => string,
  formatDate: (date: Date) => string,
}

export class TimelineGuides extends Container {
  private readonly viewportRef
  private readonly appRef
  private readonly xScale
  private readonly dateScale
  private readonly minimumStartDate: Date
  private readonly maximumEndDate: Ref<Date | undefined>
  private readonly isRunning: boolean
  private readonly formatTimeBySeconds: (date: Date) => string
  private readonly formatTimeByMinutes: (date: Date) => string
  private readonly formatDate: (date: Date) => string

  private idealGuideCount = 10
  private currentTimeGap = 120
  private labelFormatter = (date: Date): string | null => date.toLocaleTimeString()
  private readonly guides: Map<Date, TimelineGuide> = new Map()

  public constructor({
    viewportRef,
    appRef,
    xScale,
    dateScale,
    minimumStartDate,
    maximumEndDate,
    isRunning,
    formatTimeBySeconds,
    formatTimeByMinutes,
    formatDate,
  }: TimelineGuidesProps) {
    super()

    this.viewportRef = viewportRef
    this.appRef = appRef
    this.xScale = xScale
    this.dateScale = dateScale
    this.minimumStartDate = minimumStartDate
    this.maximumEndDate = maximumEndDate
    this.isRunning = isRunning
    this.formatTimeBySeconds = formatTimeBySeconds
    this.formatTimeByMinutes = formatTimeByMinutes
    this.formatDate = formatDate

    this.updateIdealGuideCount()
    this.updateCurrentTimeGap()

    this.createGuides()
  }

  public updateGuides(): void {
    const previousTimeGap = this.currentTimeGap
    this.updateCurrentTimeGap()

    if (this.isRedrawRequired(previousTimeGap)) {
      if (this.guides.size > 0) {
        this.removeChildren()
        this.guides.clear()
      }
      this.createGuides()
    } else {
      this.updateGuidePositions()
    }
  }

  private updateIdealGuideCount(): void {
    this.idealGuideCount = Math.ceil(this.appRef.screen.width / timelineGuidesMinGap)
  }

  private updateCurrentTimeGap(): void {
    const pxSpan = Math.ceil((this.viewportRef.right - this.viewportRef.left) / this.idealGuideCount)
    const timeSpan = this.dateScale(pxSpan) - this.minimumStartDate.getTime()

    const timeSpanSlot = timeSpanSlots.find(timeSlot => timeSlot.ceiling > timeSpan) ?? timeSpanSlots[0]

    this.currentTimeGap = timeSpanSlot.span
    this.setLabelFormatter(timeSpanSlot.labelFormat)
  }

  private createGuides(): void {
    let lastGuidePoint
    const maxGuidePlacement = this.dateScale(this.xScale(this.maximumEndDate.value ?? new Date()) + timelineGuidesOuterBuffer)
    let firstGuide = new Date(Math.ceil(this.dateScale(-timelineGuidesOuterBuffer) / this.currentTimeGap) * this.currentTimeGap)

    if (this.currentTimeGap > timeLengths.hour * 6) {
      firstGuide = roundDownToNearestDay(firstGuide)
    } else if (this.currentTimeGap > timeLengths.hour) {
      firstGuide = roundDownToNearestEvenNumberedHour(firstGuide)
    }

    lastGuidePoint = firstGuide

    while (lastGuidePoint.getTime() < maxGuidePlacement) {
      const guide = new TimelineGuide(this.labelFormatter(lastGuidePoint), this.appRef.screen.height)
      guide.position.set(this.getGuidePosition(lastGuidePoint), 0)

      this.guides.set(lastGuidePoint, guide)
      this.addChild(guide)

      lastGuidePoint = new Date(lastGuidePoint.getTime() + this.currentTimeGap)
    }
  }

  private getGuidePosition(date: Date): number {
    return this.xScale(date) * this.viewportRef.scale._x + this.viewportRef.worldTransform.tx
  }

  private updateGuidePositions(): void {
    this.guides.forEach((guideContainer, guideDate) => {
      const newXPosition = this.getGuidePosition(guideDate)
      if (newXPosition !== guideContainer.position.x) {
        guideContainer.position.set(this.getGuidePosition(guideDate), 0)
      }
      if (guideContainer.height !== this.appRef.screen.height) {
        guideContainer.updateHeight(this.appRef.screen.height)
      }
    })
  }

  private setLabelFormatter(labelFormat: string): void {
    switch (labelFormat) {
      case labelFormats.minutes:
        this.labelFormatter = this.formatByMinutesWithDates
        break
      case labelFormats.date:
        this.labelFormatter = this.formatDate
        break
      default:
        this.labelFormatter = this.formatTimeBySeconds
    }
  }

  private formatByMinutesWithDates(date: Date): string {
    if (date.getHours() === 0 && date.getMinutes() === 0) {
      return `${this.formatDate(date)}\n${this.formatTimeByMinutes(date)}`
    }

    return this.formatTimeByMinutes(date)
  }

  private isRedrawRequired(previousTimeGap: number): boolean {
    return previousTimeGap !== this.currentTimeGap
      || this.noGuidesExist()
      || this.isGuideLengthOutdated()
  }

  private noGuidesExist(): boolean {
    return this.guides.size === 0
  }

  private isGuideLengthOutdated(): boolean {
    if (!this.isRunning) {
      return false
    }

    const lastGuide = Array.from(this.guides).pop()?.[1]

    if (!lastGuide || !this.maximumEndDate.value) {
      return false
    }

    const lastGuidePositionFloor =
      this.getGuidePosition(this.maximumEndDate.value)
      + timelineGuidesOuterBuffer * this.viewportRef.scale._x
      - this.xScale(new Date(this.minimumStartDate.getTime() + this.currentTimeGap)) * this.viewportRef.scale._x

    return lastGuide.x < lastGuidePositionFloor
  }

  public destroy(): void {
    this.removeChildren()
    this.guides.clear()
    super.destroy.call(this)
  }
}
