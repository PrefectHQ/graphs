import type { Viewport } from 'pixi-viewport'
import { Application, Container } from 'pixi.js'
import { ComputedRef, Ref, watch, WatchStopHandle } from 'vue'
import {
  FormatDateFns,
  ParsedThemeStyles
} from '@/models'
import { TimelineGuide } from '@/pixiFunctions/timelineGuide'
import { timelineScale } from '@/pixiFunctions/timelineScale'
import {
  labelFormats,
  roundDownToNearestDay,
  roundDownToNearestEvenNumberedHour,
  timeLengths,
  timeSpanSlots
} from '@/utilities'

const timelineGuidesMinGap = 260

// how far left and right of the timeline to render guides
const timelineGuidesRenderPadding = 4000

type TimelineGuidesProps = {
  viewportRef: Viewport,
  appRef: Application,
  minimumStartDate: Date,
  maximumEndDate: Ref<Date | undefined>,
  isRunning: boolean,
  styles: ComputedRef<ParsedThemeStyles>,
  formatDateFns: ComputedRef<FormatDateFns>,
}

export class TimelineGuides extends Container {
  private readonly viewportRef
  private readonly appRef
  private readonly minimumStartDate
  private readonly maximumEndDate
  private readonly isRunning
  private readonly styles
  private readonly formatDateFns

  private readonly unwatch: WatchStopHandle

  private idealGuideCount = 10
  private currentTimeGap = 120
  private labelFormatter = (date: Date): string | null => date.toLocaleTimeString()
  private readonly guides: Map<Date, TimelineGuide> = new Map()

  public constructor({
    viewportRef,
    appRef,
    minimumStartDate,
    maximumEndDate,
    isRunning,
    styles,
    formatDateFns,
  }: TimelineGuidesProps) {
    super()

    this.viewportRef = viewportRef
    this.appRef = appRef
    this.minimumStartDate = minimumStartDate
    this.maximumEndDate = maximumEndDate
    this.isRunning = isRunning
    this.styles = styles
    this.formatDateFns = formatDateFns

    this.updateIdealGuideCount()
    this.updateCurrentTimeGap()

    this.createGuides()

    this.unwatch = watch(styles, () => {
      this.removeChildren()
      this.guides.clear()
      this.createGuides()
    }, { deep: true })

    this.interactive = false
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
    const timeSpan = timelineScale.xToDate(pxSpan) - this.minimumStartDate.getTime()

    const timeSpanSlot = timeSpanSlots.find(timeSlot => timeSlot.ceiling > timeSpan) ?? timeSpanSlots[0]

    this.currentTimeGap = timeSpanSlot.span
    this.setLabelFormatter(timeSpanSlot.labelFormat)
  }

  private createGuides(): void {
    let lastGuidePoint
    const maxGuidePlacement = timelineScale.xToDate(timelineScale.dateToX(this.maximumEndDate.value ?? new Date()) + timelineGuidesRenderPadding)
    let firstGuide = new Date(Math.ceil(timelineScale.xToDate(-timelineGuidesRenderPadding) / this.currentTimeGap) * this.currentTimeGap)

    if (this.currentTimeGap > timeLengths.hour * 6) {
      firstGuide = roundDownToNearestDay(firstGuide)
    } else if (this.currentTimeGap > timeLengths.hour) {
      firstGuide = roundDownToNearestEvenNumberedHour(firstGuide)
    }

    lastGuidePoint = firstGuide

    while (lastGuidePoint.getTime() < maxGuidePlacement) {
      const guide = new TimelineGuide({
        labelText: this.labelFormatter(lastGuidePoint),
        styles: this.styles,
        appHeight: this.appRef.screen.height,
      })
      guide.position.set(this.getGuidePosition(lastGuidePoint), 0)

      this.guides.set(lastGuidePoint, guide)
      this.addChild(guide)

      lastGuidePoint = new Date(lastGuidePoint.getTime() + this.currentTimeGap)
    }
  }

  private getGuidePosition(date: Date): number {
    return timelineScale.dateToX(date) * this.viewportRef.scale._x + this.viewportRef.worldTransform.tx
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
        this.labelFormatter = this.formatDateFns.value.date
        break
      default:
        this.labelFormatter = this.formatDateFns.value.timeBySeconds
    }
  }

  private formatByMinutesWithDates(date: Date): string {
    if (date.getHours() === 0 && date.getMinutes() === 0) {
      return `${this.formatDateFns.value.date(date)}\n${this.formatDateFns.value.timeByMinutes(date)}`
    }

    return this.formatDateFns.value.timeByMinutes(date)
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
      + timelineGuidesRenderPadding * this.viewportRef.scale._x
      - timelineScale.dateToX(new Date(this.minimumStartDate.getTime() + this.currentTimeGap)) * this.viewportRef.scale._x

    return lastGuide.x < lastGuidePositionFloor
  }

  public destroy(): void {
    this.removeChildren()
    this.guides.forEach(guide => guide.destroy())
    this.guides.clear()
    this.unwatch()
    super.destroy.call(this)
  }
}
