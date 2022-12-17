// @TODO: Could use some refactoring here so that props aren't passed around so much

import { Viewport } from 'pixi-viewport'
import { Application, BitmapText, Container, Graphics } from 'pixi.js'
import { TextStyles } from '@/models'

let timelineGuides: Record<string, Container> = {}

const timelineGuidesMinGap = 80
const timelineGuidesMaxGap = 260
let timelineGuidesIdealCount = 10
let timelineGuidesCurrentTimeGap = 1000 * 30
// how far left and right of the timeline to render guides
const timelineGuidesXPadding = 4000

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
  app: Application,
  viewport: Viewport,
  stage: HTMLElement | undefined,
  timelineGuidesContainer: Container,
  minimumStartDate: Date,
  overallGraphWidth: number,
  dateScale: (x: number) => number,
  xScale: (date: Date) => number,
  textStyles: TextStyles,
}

export function initTimelineGuides(props: TimelineGuidesProps): void {
  if (!props.stage) {
    console.error('TimelineGuides: stage is undefined')
    return
  }

  setTimelineGuidesCurrentTimeGap(props)
  timelineGuidesIdealCount = Math.ceil(
    props.stage.clientWidth / (timelineGuidesMaxGap - timelineGuidesMinGap / 2))

  props.app.ticker.add(() => {
    // @TODO: Only run update if the viewport has changed to avoid unnecessary work
    updateTimelineGuides(props)
  })
}

function updateTimelineGuides(props: TimelineGuidesProps): void {
  const previousTimelineGuidesTimeGap = timelineGuidesCurrentTimeGap
  setTimelineGuidesCurrentTimeGap(props)

  if (previousTimelineGuidesTimeGap !== timelineGuidesCurrentTimeGap) {
    if (Object.keys(timelineGuides).length > 0) {
      Object.keys(timelineGuides).forEach((key) => {
        timelineGuides[key].destroy()
      })
      timelineGuides = {}
    }
    createTimelineGuides(props)
  } else {
    updateTimelineGuidesPositions(props)
  }
}

function createTimelineGuides(props: TimelineGuidesProps): void {
  const {
    timelineGuidesContainer,
    dateScale,
    overallGraphWidth,
  } = props

  let lastGuidePoint
  const maxGuidePlacement = dateScale(overallGraphWidth + timelineGuidesXPadding)
  const firstGuide = new Date(Math.ceil(dateScale(-timelineGuidesXPadding) / timelineGuidesCurrentTimeGap) * timelineGuidesCurrentTimeGap)

  lastGuidePoint = firstGuide

  while (lastGuidePoint.getTime() < maxGuidePlacement) {
    const guide = createTimelineGuide(lastGuidePoint, props)

    timelineGuides[lastGuidePoint.getTime()] = guide

    timelineGuidesContainer.addChild(guide)

    lastGuidePoint = new Date(lastGuidePoint.getTime() + timelineGuidesCurrentTimeGap)
  }
}

function createTimelineGuide(date: Date, props: TimelineGuidesProps): Container {
  const { app, textStyles } = props
  const guide = new Container()
  guide.position.set(getGuidePosition(date, props), 0)

  const guideLine = new Graphics()
  guideLine.beginFill(0xc9d5e2)
  guideLine.drawRect(
    0,
    0,
    1,
    app.renderer.height,
  )
  guideLine.endFill()

  const guideLabel = new BitmapText(date.toLocaleTimeString(), textStyles.timeMarkerLabel)
  guideLabel.position.set(4, 4)

  guide.addChild(guideLine)
  guide.addChild(guideLabel)

  return guide
}

function updateTimelineGuidesPositions(props: TimelineGuidesProps): void {
  Object.keys(timelineGuides).forEach((key) => {
    const guide = timelineGuides[key]
    guide.position.set(getGuidePosition(new Date(Number(key)), props), 0)
  })
}

function getGuidePosition(date: Date, props: TimelineGuidesProps): number {
  const { viewport, xScale } = props

  return xScale(date) * viewport.scale._x + viewport.worldTransform.tx
}

function setTimelineGuidesCurrentTimeGap(props: TimelineGuidesProps): void {
  const { viewport, dateScale, minimumStartDate } = props

  const pxSpan = Math.ceil((viewport.right - viewport.left) / timelineGuidesIdealCount)
  const timeSpan = dateScale(pxSpan) - minimumStartDate.getTime()

  timelineGuidesCurrentTimeGap = timeSpanSlots.find(timeSlot => timeSlot.ceiling > timeSpan)?.span ?? timeSpanSlots[0].span
}
