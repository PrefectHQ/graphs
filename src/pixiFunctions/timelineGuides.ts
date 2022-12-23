import type { Viewport } from 'pixi-viewport'
import { Container } from 'pixi.js'
import { TimelineGuide } from './timelineGuide'

const timelineGuidesMinGap = 80
const timelineGuidesMaxGap = 260

const timelineGuidesStyles = {
  // how far left and right of the timeline to render guides
  xPadding: 4000,
}

const time = {
  second: 1000,
  minute: 1000 * 60,
  hour: 1000 * 60 * 60,
  day: 1000 * 60 * 60 * 24,
  week: 1000 * 60 * 60 * 24 * 7,
}
const timeSpanSlots = [
  {
    ceiling: time.second * 4,
    span: time.second,
  }, {
    ceiling: time.second * 8,
    span: time.second * 5,
  }, {
    ceiling: time.second * 13,
    span: time.second * 10,
  }, {
    ceiling: time.second * 20,
    span: time.second * 15,
  }, {
    ceiling: time.second * 45,
    span: time.second * 30,
  }, {
    ceiling: time.minute * 4,
    span: time.minute,
  }, {
    ceiling: time.minute * 8,
    span: time.minute * 5,
  }, {
    ceiling: time.minute * 13,
    span: time.minute * 10,
  }, {
    ceiling: time.minute * 28,
    span: time.minute * 15,
  }, {
    ceiling: time.hour * 1.24,
    span: time.minute * 30,
  }, {
    ceiling: time.hour * 3,
    span: time.hour,
  }, {
    ceiling: time.hour * 8,
    span: time.hour * 5,
  }, {
    ceiling: time.hour * 13,
    span: time.hour * 10,
  }, {
    ceiling: time.hour * 22,
    span: time.hour * 12,
  }, {
    ceiling: time.day * 4,
    span: time.day,
  }, {
    ceiling: time.week * 2,
    span: time.week,
  }, {
    ceiling: Infinity,
    span: time.week * 4,
  },
]

type TimelineGuidesProps = {
  viewportRef: Viewport,
  stageWidth: number,
  guideHeight: number,
  overallGraphWidth: number,
  xScale: (x: Date) => number,
  dateScale: (x: number) => number,
  minimumStartDate: Date,
  maximumEndDate: Date,
}

export class TimelineGuides extends Container {
  private readonly viewportRef
  private readonly stageWidth
  private readonly guideHeight
  private readonly overallGraphWidth
  private readonly xScale
  private readonly dateScale
  private readonly minimumStartDate: Date
  private readonly maximumEndDate: Date

  private idealGuideCount = 10
  private currentTimeGap = 120
  private readonly guides: Map<Date, Container> = new Map()

  public constructor({
    viewportRef,
    stageWidth,
    guideHeight,
    overallGraphWidth,
    xScale,
    dateScale,
    minimumStartDate,
    maximumEndDate,
  }: TimelineGuidesProps) {
    super()

    this.viewportRef = viewportRef
    this.stageWidth = stageWidth
    this.guideHeight = guideHeight
    this.overallGraphWidth = overallGraphWidth
    this.xScale = xScale
    this.dateScale = dateScale
    this.minimumStartDate = minimumStartDate
    this.maximumEndDate = maximumEndDate

    this.updateIdealGuideCount()
    this.updateCurrentTimeGap()

    this.createGuides()
  }

  public updateGuides(): void {
    const previousTimeGap = this.currentTimeGap
    this.updateCurrentTimeGap()

    const lastGuide = Array.from(this.guides).pop()?.[1]

    if (
      this.guides.size === 0
    // timeline gaps have changed
    || previousTimeGap !== this.currentTimeGap
    // timeline has grown from running, add more guides
    || lastGuide && lastGuide.x + this.currentTimeGap < this.xScale(this.maximumEndDate) + timelineGuidesStyles.xPadding
    ) {
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
    this.idealGuideCount = Math.ceil(
      this.stageWidth / (timelineGuidesMaxGap - timelineGuidesMinGap / 2))
  }

  private updateCurrentTimeGap(): void {

    const pxSpan = Math.ceil((this.viewportRef.right - this.viewportRef.left) / this.idealGuideCount)
    const timeSpan = this.dateScale(pxSpan) - this.minimumStartDate.getTime()

    this.currentTimeGap = timeSpanSlots.find(timeSlot => timeSlot.ceiling > timeSpan)?.span ?? timeSpanSlots[0].span
  }

  private createGuides(): void {
    let lastGuidePoint
    const maxGuidePlacement = this.dateScale(this.overallGraphWidth + timelineGuidesStyles.xPadding)
    const firstGuide = new Date(Math.ceil(this.dateScale(-timelineGuidesStyles.xPadding) / this.currentTimeGap) * this.currentTimeGap)

    lastGuidePoint = firstGuide

    while (lastGuidePoint.getTime() < maxGuidePlacement) {
      const guide = new TimelineGuide(lastGuidePoint.toLocaleTimeString(), this.guideHeight)
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
      guideContainer.position.set(this.getGuidePosition(guideDate), 0)
    })
  }

  public destroy(): void {
    this.removeChildren()
    this.guides.clear()
    super.destroy.call(this)
  }
}
