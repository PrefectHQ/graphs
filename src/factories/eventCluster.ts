import { Container } from 'pixi.js'
import { circleFactory } from '@/factories/circle'
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

  const { eventRadiusDefault } = config.styles // TODO: use event cluster radius or font size?

  const circle = await circleFactory({ radius: eventRadiusDefault })

  element.addChild(circle)

  let currentDate: Date | null = null
  let currentIds: string[] = []

  function render(props?: EventClusterFactoryRenderProps): void {
    if (!props) {
      currentDate = null
      currentIds = []
      element.visible = false
      return
    }

    const { ids, date } = props
    currentDate = date
    currentIds = ids


    element.visible = true
  }

  function getDate(): Date | null {
    return currentDate
  }

  return {
    element,
    render,
    getDate,
  }
}