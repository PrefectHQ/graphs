import { Container } from 'pixi.js'
import { circleFactory } from '@/factories/circle'
import { nodeLabelFactory } from '@/factories/label'
import { rectangleFactory } from '@/factories/rectangle'
import { waitForConfig } from '@/objects/config'

export type EventClusterFactory = Awaited<ReturnType<typeof eventClusterFactory>>

export type EventClusterFactoryRenderProps = {
  ids: string[],
  date: Date,
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export async function eventClusterFactory() {
  const element = new Container()
  const config = await waitForConfig()

  const {
    eventClusterColor,
    eventRadiusEventDefault,
    eventTargetSize,
  } = config.styles

  const targetArea = await rectangleFactory()
  const circle = await circleFactory({ radius: eventRadiusEventDefault })
  const { element: label, render: renderLabelText } = await nodeLabelFactory({ cullAtZoomThreshold: false })

  targetArea.alpha = 0
  targetArea.width = eventTargetSize
  targetArea.height = eventTargetSize
  element.addChild(targetArea)

  circle.tint = eventClusterColor
  circle.anchor.set(0.5)
  circle.position.set(eventTargetSize / 2, eventTargetSize / 2)
  element.addChild(circle)

  element.addChild(label)

  let currentDate: Date | null = null
  let currentIds: string[] = []

  async function render(props?: EventClusterFactoryRenderProps): Promise<void> {
    if (!props) {
      currentDate = null
      currentIds = []
      element.visible = false
      return
    }

    const { ids, date } = props
    currentDate = date
    currentIds = ids

    await renderLabel(ids.length.toString())

    element.visible = true
  }

  async function renderLabel(labelText: string): Promise<void> {
    if (currentIds.length < 2) {
      return
    }

    const labelYNudge = -1

    label.scale.set(0.6)
    label.anchor.set(0.5)
    label.position.set(
      eventTargetSize / 2,
      eventTargetSize / 2 + labelYNudge,
    )

    await renderLabelText(labelText)
  }

  function getIds(): string[] {
    return currentIds
  }

  function getDate(): Date | null {
    return currentDate
  }

  return {
    element,
    render,
    getIds,
    getDate,
  }
}