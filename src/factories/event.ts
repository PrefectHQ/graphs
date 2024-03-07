import { Container } from 'pixi.js'
import { circleFactory } from '@/factories/circle'
import { rectangleFactory } from '@/factories/rectangle'
import { selectedBorderFactory } from '@/factories/selectedBorder'
import { RunGraphEvent } from '@/models'
import { waitForConfig } from '@/objects/config'
import { emitter } from '@/objects/events'
import { isSelected } from '@/objects/selection'

export type EventFactory = Awaited<ReturnType<typeof eventFactory>>

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export async function eventFactory(event: RunGraphEvent) {
  const element = new Container()
  const config = await waitForConfig()

  const targetArea = await rectangleFactory()
  const circle = await circleFactory({ radius: config.styles.eventRadiusDefault })
  const { element: border, render: renderBorder } = await selectedBorderFactory()

  let selected = false

  element.addChild(targetArea)
  element.addChild(circle)
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
    const isCurrentlySelected = isSelected({ kind: 'event', id: event.id, occurred: event.occurred })

    if (isCurrentlySelected !== selected) {
      selected = isCurrentlySelected

      // reset hover affect as the downstream popover prevents the mouseleave event
      circle.scale.set(isCurrentlySelected ? 1.5 : 1)

      render()
    }
  })

  function render(): void {
    const { eventColor, eventTargetSize, eventSelectedBorderInset } = config.styles

    targetArea.alpha = 0
    targetArea.width = eventTargetSize
    targetArea.height = eventTargetSize

    circle.tint = eventColor
    circle.anchor.set(0.5)
    circle.position.set(eventTargetSize / 2, eventTargetSize / 2)

    border.position.set(eventSelectedBorderInset, eventSelectedBorderInset)
    renderBorder({
      selected,
      width: eventTargetSize - eventSelectedBorderInset * 2,
      height: eventTargetSize - eventSelectedBorderInset * 2,
    })
  }


  function getId(): string {
    return event.id
  }

  function getDate(): Date {
    return event.occurred
  }

  return {
    element,
    render,
    getId,
    getDate,
  }
}