import { ColorSource, Container } from 'pixi.js'
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

type StateRectangleRenderProps = {
  x: number,
  width: number,
  background: ColorSource,
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export async function flowRunStateFactory(state: StateEvent, options?: FlowRunStateFactoryOptions) {
  const application = await waitForApplication()
  const viewport = await waitForViewport()
  const config = await waitForConfig()
  let scale = await waitForScale()

  const element = new Container()
  const bar = await rectangleFactory()
  const area = await rectangleFactory()

  let end: Date | null = options?.end ?? null

  element.addChild(area)
  element.addChild(bar)

  emitter.on('viewportMoved', () => render())
  emitter.on('scaleUpdated', updated => {
    scale = updated
    render()
  })

  function render(newOptions?: FlowRunStateFactoryOptions): void {
    if (newOptions) {
      const { end: newEnd } = newOptions
      end = newEnd
    }

    if (!layout.isTemporal()) {
      element.visible = false
      return
    }

    const options = getRenderStyles()

    renderBar(options)
    renderArea(options)
  }

  function getRenderStyles(): StateRectangleRenderProps {
    const { background = '#fff' } = config.styles.state(state)

    const x = Math.max(scale(state.occurred) * viewport.scale._x + viewport.worldTransform.tx, 0)

    const width = end
      ? scale(end) * viewport.scale._x + viewport.worldTransform.tx - x
      : application.screen.width - x

    return {
      x,
      width: Math.max(width, 0),
      background,
    }
  }

  function renderBar({ x, width, background }: StateRectangleRenderProps): void {
    const { flowStateBarHeight } = config.styles

    bar.x = x
    bar.y = application.screen.height - flowStateBarHeight
    bar.width = width
    bar.height = flowStateBarHeight
    bar.tint = background
  }

  function renderArea({ x, width, background }: StateRectangleRenderProps): void {
    if (state.type === 'RUNNING') {
      area.visible = false
      return
    }

    const { flowStateBarHeight, flowStateAreaAlpha } = config.styles

    area.x = x
    area.y = 0
    area.width = width
    area.height = application.screen.height - flowStateBarHeight
    area.tint = background
    area.alpha = flowStateAreaAlpha
  }

  return {
    element,
    render,
  }
}