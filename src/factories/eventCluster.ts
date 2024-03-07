import { Container } from 'pixi.js'
import { circleFactory } from '@/factories/circle'
import { nodeLabelFactory } from '@/factories/label'
import { rectangleFactory } from '@/factories/rectangle'
import { selectedBorderFactory } from '@/factories/selectedBorder'
import { waitForConfig } from '@/objects/config'
import { emitter } from '@/objects/events'
import { isSelected } from '@/objects/selection'

export type EventClusterFactory = Awaited<ReturnType<typeof eventClusterFactory>>

export type EventClusterFactoryRenderProps = {
  ids: string[],
  date: Date,
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export async function eventClusterFactory() {
  const element = new Container()
  const config = await waitForConfig()

  const targetArea = await rectangleFactory()
  const circle = await circleFactory({ radius: config.styles.eventClusterRadiusDefault })
  const { element: border, render: renderSelectedBorder } = await selectedBorderFactory()
  const { element: label, render: renderLabelText } = await nodeLabelFactory({ cullAtZoomThreshold: false })

  let currentDate: Date | null = null
  let currentIds: string[] = []
  let selected = false

  element.addChild(targetArea)
  element.addChild(circle)
  element.addChild(label)
  element.addChild(border)

  element.eventMode = 'static'
  element.cursor = 'pointer'

  element.on('mouseenter', () => {
    if (!selected) {
      circle.scale.set(1.5)
    }
  })
  element.on('mouseleave', () => {
    if (!selected) {
      circle.scale.set(1)
    }
  })

  emitter.on('itemSelected', () => {
    const isCurrentlySelected = isSelected({ kind: 'events', occurred: currentDate, ids: currentIds })

    if (isCurrentlySelected !== selected) {
      selected = isCurrentlySelected

      // reset hover affect as the downstream popover prevents the mouseleave event
      circle.scale.set(isCurrentlySelected ? 1.5 : 1)

      if (currentDate) {
        render({ ids: currentIds, date: currentDate })
      }
    }
  })

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

    renderTargetArea()
    renderCircle()
    renderBorder()
    await renderLabel(ids.length.toString())

    element.visible = true
  }

  function renderTargetArea(): void {
    const { eventTargetSize } = config.styles

    targetArea.alpha = 0
    targetArea.width = eventTargetSize
    targetArea.height = eventTargetSize
  }

  function renderCircle(): void {
    const { eventClusterColor, eventTargetSize } = config.styles

    circle.tint = eventClusterColor
    circle.anchor.set(0.5)
    circle.position.set(eventTargetSize / 2, eventTargetSize / 2)
  }

  async function renderLabel(labelText: string): Promise<void> {
    if (currentIds.length < 2) {
      return
    }

    const { eventTargetSize } = config.styles
    const labelYNudge = -1

    label.scale.set(0.6)
    label.anchor.set(0.5)
    label.position.set(
      eventTargetSize / 2,
      eventTargetSize / 2 + labelYNudge,
    )

    await renderLabelText(labelText)
  }

  function renderBorder(): void {
    const { eventSelectedBorderInset, eventTargetSize } = config.styles

    border.position.set(eventSelectedBorderInset, eventSelectedBorderInset)
    renderSelectedBorder({
      selected,
      width: eventTargetSize - eventSelectedBorderInset * 2,
      height: eventTargetSize - eventSelectedBorderInset * 2,
    })
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