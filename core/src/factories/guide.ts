import { Container } from 'pixi.js'
import { rectangleFactory } from '@/factories/rectangle'
import { FormatDate } from '@/models/guides'
import { waitForViewport } from '@/objects'
import { waitForApplication } from '@/objects/application'
import { waitForConfig } from '@/objects/config'
import { emitter } from '@/objects/events'
import { waitForFonts } from '@/objects/fonts'
import { waitForScale } from '@/objects/scale'
import { waitForSettings } from '@/objects/settings'

export type GuideFactory = Awaited<ReturnType<typeof guideFactory>>

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export async function guideFactory() {
  const application = await waitForApplication()
  const viewport = await waitForViewport()
  const settings = await waitForSettings()
  const config = await waitForConfig()
  const { inter } = await waitForFonts()
  const element = new Container()

  const rectangle = await rectangleFactory()
  element.addChild(rectangle)

  const label = inter('')
  element.addChild(label)

  let scale = await waitForScale()
  let currentDate: Date | undefined
  let currentLabelFormatter: FormatDate

  emitter.on('scaleUpdated', updated => {
    scale = updated
    updatePosition()
  })
  emitter.on('viewportMoved', () => {
    if (settings.disableGuides) {
      return
    }

    updatePosition()

    if (element.height !== application.screen.height) {
      renderLine()
    }
  })

  function render(date: Date, labelFormatter: FormatDate): void {
    currentDate = date
    currentLabelFormatter = labelFormatter

    renderLine()
    renderLabel(date)
  }

  function renderLine(): void {
    rectangle.width = config.styles.guideLineWidth
    rectangle.height = application.screen.height
    rectangle.tint = config.styles.guideLineColor
  }

  function renderLabel(date: Date): void {
    label.text = currentLabelFormatter(date)
    label.fontSize = config.styles.guideTextSize
    label.tint = config.styles.guideTextColor
    label.position.set(config.styles.guideTextLeftPadding, config.styles.guideTextTopPadding)
  }

  function updatePosition(): void {
    if (currentDate !== undefined) {
      element.position.x = scale(currentDate) * viewport.scale._x + viewport.worldTransform.tx
    }
  }

  return {
    element,
    render,
  }
}