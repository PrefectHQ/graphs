import { Container } from 'pixi.js'
import { rectangleFactory } from '@/factories/rectangle'
import { StateEvent } from '@/models/states'
import { waitForApplication, waitForViewport } from '@/objects'
import { waitForConfig } from '@/objects/config'
import { emitter } from '@/objects/events'
import { waitForScale } from '@/objects/scale'
import { layout } from '@/objects/settings'

export type FlowRunStateFactory = Awaited<ReturnType<typeof flowRunStateFactory>>

type FlowRunStateFactoryOptions = {
  end: Date,
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export async function flowRunStateFactory(state: StateEvent, options?: FlowRunStateFactoryOptions) {
  const application = await waitForApplication()
  const viewport = await waitForViewport()
  const config = await waitForConfig()
  let scale = await waitForScale()

  const element = new Container()
  const solidBar = await rectangleFactory()

  let end: Date | null = options?.end ?? null

  element.addChild(solidBar)

  emitter.on('viewportMoved', () => render())
  emitter.on('scaleUpdated', updated => {
    scale = updated
    render()
  })

  function render(newOptions?: FlowRunStateFactoryOptions): Container {
    if (newOptions) {
      const { end: newEnd } = newOptions
      end = newEnd
    }

    if (!layout.isTemporal()) {
      element.visible = false
      return element
    }

    renderSolidBar()

    return element
  }

  function renderSolidBar(): void {
    const { flowStateSolidBarHeight } = config.styles
    const { background = '#fff' } = config.styles.state(state)

    const x = scale(state.occurred) * viewport.scale._x + viewport.worldTransform.tx
    const width = end
      ? scale(end) * viewport.scale._x + viewport.worldTransform.tx - x
      : application.screen.width - x

    solidBar.x = x > 0 ? x : 0
    solidBar.y = application.screen.height - flowStateSolidBarHeight
    solidBar.width = width > 0 ? width : 0
    solidBar.height = flowStateSolidBarHeight
    solidBar.tint = background
  }

  return {
    element,
    render,
  }
}