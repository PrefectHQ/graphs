import { Container } from 'pixi.js'
import { circleFactory } from '@/factories/circle'
import { Event } from '@/models'
import { waitForConfig } from '@/objects/config'

export type EventFactory = Awaited<ReturnType<typeof eventFactory>>

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export async function eventFactory(event: Event) {
  const element = new Container()
  const config = await waitForConfig()

  const { eventRadiusDefault } = config.styles

  const circle = await circleFactory({ radius: eventRadiusDefault })

  element.addChild(circle)

  function render(): void {
    // todo
  }

  function getDate(): Date {
    return event.occurred
  }

  return {
    element,
    render,
    getDate,
  }
}