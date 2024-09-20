import { Container } from 'pixi.js'
import { circleFactory } from '@/factories/circle'
import { rectangleFactory } from '@/factories/rectangle'
import { GraphEvent } from '@/models/Graph'
import { waitForConfig } from '@/objects/config'
import { emitter } from '@/objects/events'

export type EventFactory = Awaited<ReturnType<typeof eventFactory>>

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export async function eventFactory(event: GraphEvent) {
  const element = new Container()
  const config = await waitForConfig()

  const targetArea = await rectangleFactory()
  const circle = await circleFactory({ radius: config.styles.eventRadiusDefault })

  const selected = false

  element.addChild(targetArea)
  element.addChild(circle)

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

  function render(): void {
    const { eventColor, eventTargetSize } = config.styles

    targetArea.alpha = 0
    targetArea.width = eventTargetSize
    targetArea.height = eventTargetSize

    circle.tint = eventColor
    circle.anchor.set(0.5)
    circle.position.set(eventTargetSize / 2, eventTargetSize / 2)
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