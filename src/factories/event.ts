import { Container } from 'pixi.js'
import { circleFactory } from '@/factories/circle'
import { rectangleFactory } from '@/factories/rectangle'
import { Event } from '@/models'
import { waitForConfig } from '@/objects/config'

export type EventFactory = Awaited<ReturnType<typeof eventFactory>>

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export async function eventFactory(event: Event) {
  const element = new Container()
  const config = await waitForConfig()

  const targetArea = await rectangleFactory()
  const circle = await circleFactory({ radius: config.styles.eventRadiusDefault })

  element.addChild(targetArea)
  element.addChild(circle)

  function render(): void {
    renderTargetArea()
    renderCircle()
  }

  function renderTargetArea(): void {
    const { eventTargetSize } = config.styles

    targetArea.alpha = 0
    targetArea.width = eventTargetSize
    targetArea.height = eventTargetSize
  }

  function renderCircle(): void {
    const { eventColor, eventTargetSize } = config.styles

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