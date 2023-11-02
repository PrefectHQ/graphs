import { Container, Ticker } from 'pixi.js'
import { rectangleFactory } from '@/factories/rectangle'
import { FormatDate } from '@/models/guides'
import { waitForViewport } from '@/objects'
import { waitForApplication } from '@/objects/application'
import { waitForConfig } from '@/objects/config'
import { waitForCull } from '@/objects/culling'
import { waitForFonts } from '@/objects/fonts'
import { waitForScale } from '@/objects/scale'

export type GuideFactory = Awaited<ReturnType<typeof guideFactory>>

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export async function guideFactory() {
  const application = await waitForApplication()
  const viewport = await waitForViewport()
  const cull = await waitForCull()
  const scale = await waitForScale()
  const { styles } = await waitForConfig()
  const { inter } = await waitForFonts()

  const element = new Container()
  cull.add(element)

  const rectangle = await rectangleFactory()
  element.addChild(rectangle)

  const label = inter('')
  element.addChild(label)

  let currentDate: Date | undefined
  let currentLabelFormatter: FormatDate

  application.ticker.add(() => {
    if (currentDate !== undefined) {
      element.position.x = scale(currentDate) * viewport.scale._x + viewport.worldTransform.tx
    }
    if (element.height !== application.screen.height) {
      renderLine()
    }
  })

  async function render(date: Date, labelFormatter: FormatDate): Promise<void> {
    currentDate = date
    currentLabelFormatter = labelFormatter

    renderLine()
    await renderLabel(date)
  }

  function renderLine(): void {
    rectangle.width = styles.guideLineWidth
    rectangle.height = application.screen.height
    rectangle.tint = styles.guideLineColor
  }

  async function renderLabel(date: Date): Promise<void> {
    label.text = currentLabelFormatter(date)
    label.fontSize = styles.guideTextSize
    label.tint = styles.guideTextColor
    label.position.set(styles.guideTextLeftPadding, styles.guideTextTopPadding)

    await label
  }

  return {
    element,
    render,
  }
}