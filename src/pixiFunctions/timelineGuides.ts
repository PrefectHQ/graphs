import { Container } from 'pixi.js'
import { ComputedRef, Ref, watch, WatchStopHandle } from 'vue'
import { FormatDateFns, GraphState } from '@/models'
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

type TimelineGuideProps = {
  graphState: GraphState,
  maximumEndDate: Ref<Date | undefined>,
  formatDateFns: ComputedRef<FormatDateFns>,
}

export class TimelineGuides extends Container {
  private readonly graphState
  private readonly maximumEndDate
  private readonly formatDateFns

  private readonly unWatchers: WatchStopHandle[] = []

  private idealGuideCount = 10
  private currentTimeGap = 120
  private labelFormatter = (date: Date): string | null => date.toLocaleTimeString()
  private readonly guides: Map<Date, TimelineGuide> = new Map()

  public constructor({
    graphState,
    maximumEndDate,
    formatDateFns,
  }: TimelineGuideProps) {
    super()

    this.graphState = graphState
    this.maximumEndDate = maximumEndDate
    this.formatDateFns = formatDateFns

    this.updateIdealGuideCount()
    this.updateCurrentTimeGap()

    this.createGuides()

    this.initWatchers()

    this.interactive = false
  }

  private initWatchers(): void {
    const { styleOptions } = this.graphState

    this.unWatchers.push(
      watch(styleOptions, () => {
        this.removeChildren()
        this.guides.clear()
        this.createGuides()
      }, { deep: true }),
    )
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
    const { pixiApp } = this.graphState
    this.idealGuideCount = Math.ceil(pixiApp.screen.width / timelineGuidesMinGap)
  }

  private updateCurrentTimeGap(): void {
    const { viewport } = this.graphState
    const { minimumStartTime } = this.graphState.timeScaleProps

    const pxSpan = Math.ceil((viewport.right - viewport.left) / this.idealGuideCount)
    const timeSpan = timelineScale.xToDate(pxSpan) - minimumStartTime

    const timeSpanSlot = timeSpanSlots.find(timeSlot => timeSlot.ceiling > timeSpan) ?? timeSpanSlots[0]

    this.currentTimeGap = timeSpanSlot.span
    this.setLabelFormatter(timeSpanSlot.labelFormat)
  }

  private createGuides(): void {
    const { pixiApp, styleOptions } = this.graphState

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
        pixiApp,
        labelText: this.labelFormatter(lastGuidePoint),
        styleOptions,
      })
      guide.position.set(this.getGuidePosition(lastGuidePoint), 0)

      this.guides.set(lastGuidePoint, guide)
      this.addChild(guide)

      lastGuidePoint = new Date(lastGuidePoint.getTime() + this.currentTimeGap)
    }
  }

  private getGuidePosition(date: Date): number {
    const { viewport } = this.graphState

    return timelineScale.dateToX(date) * viewport.scale._x + viewport.worldTransform.tx
  }

  private updateGuidePositions(): void {
    const { pixiApp } = this.graphState

    this.guides.forEach((guideContainer, guideDate) => {
      const newXPosition = this.getGuidePosition(guideDate)
      if (newXPosition !== guideContainer.position.x) {
        guideContainer.position.set(this.getGuidePosition(guideDate), 0)
      }
      if (guideContainer.height !== pixiApp.screen.height) {
        guideContainer.updateHeight(pixiApp.screen.height)
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
    const { isRunning, viewport, timeScaleProps } = this.graphState
    const { minimumStartTime } = timeScaleProps

    if (!isRunning.value) {
      return false
    }

    const lastGuide = Array.from(this.guides).pop()?.[1]

    if (!lastGuide || !this.maximumEndDate.value) {
      return false
    }

    const lastGuidePositionFloor =
      this.getGuidePosition(this.maximumEndDate.value)
      + timelineGuidesRenderPadding * viewport.scale._x
      - timelineScale.dateToX(new Date(minimumStartTime + this.currentTimeGap)) * viewport.scale._x

    return lastGuide.x < lastGuidePositionFloor
  }

  public destroy(): void {
    this.removeChildren()
    this.guides.forEach(guide => guide.destroy())
    this.guides.clear()
    this.unWatchers.forEach(unwatch => unwatch())
    super.destroy.call(this)
  }
}
