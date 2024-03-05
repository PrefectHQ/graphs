import { ColorSource, Container } from 'pixi.js'
import { rectangleFactory } from '@/factories/rectangle'
import { RunGraphStateEvent } from '@/models/states'
import { waitForApplication, waitForViewport } from '@/objects'
import { waitForConfig } from '@/objects/config'
import { emitter } from '@/objects/events'
import { waitForRunData } from '@/objects/nodes'
import { waitForScale } from '@/objects/scale'
import { isSelected, selectItem } from '@/objects/selection'
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
export async function flowRunStateFactory(state: RunGraphStateEvent, options?: FlowRunStateFactoryOptions) {
  const application = await waitForApplication()
  const viewport = await waitForViewport()
  const config = await waitForConfig()
  const data = await waitForRunData()
  let scale = await waitForScale()

  const element = new Container()
  const bar = await rectangleFactory()
  const area = await rectangleFactory()

  let end: Date | null = options?.end ?? null
  let hovered = false
  let selected = false

  element.addChild(area)
  element.addChild(bar)

  bar.eventMode = 'static'
  bar.cursor = 'pointer'
  bar.on('mouseover', () => {
    hovered = true
    render()
  })
  bar.on('mouseleave', () => {
    hovered = false
    render()
  })
  bar.on('click', () => {
    const position = {
      x: bar.position.x,
      y: bar.position.y,
      width: bar.width,
      height: bar.height,
    }

    selectItem({ ...state, kind: 'state', position })
  })

  emitter.on('viewportMoved', () => render())
  emitter.on('scaleUpdated', updated => {
    scale = updated
    render()
  })
  emitter.on('itemSelected', item => {
    const isCurrentlySelected = isSelected({ kind: 'state', ...state })

    if (isCurrentlySelected !== selected) {
      selected = isCurrentlySelected
      render()
    }
  })

  if (state.type === 'RUNNING' && !data.end_time) {
    startTicking()
  }

  function render(newOptions?: FlowRunStateFactoryOptions): void {
    if (newOptions) {
      const { end: newEnd } = newOptions
      end = newEnd
    }

    if (data.end_time) {
      stopTicking()
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

    const x = Math.max(scale(state.timestamp) * viewport.scale._x + viewport.worldTransform.tx, 0)

    let width = 0

    if (state.type === 'RUNNING' && !data.end_time) {
      width = scale(new Date()) * viewport.scale._x + viewport.worldTransform.tx - x
    } else if (end) {
      width = scale(end) * viewport.scale._x + viewport.worldTransform.tx - x
    } else {
      width = application.screen.width - x
    }

    return {
      x,
      width: Math.max(width, 0),
      background,
    }
  }

  function renderBar({ x, width, background }: StateRectangleRenderProps): void {
    const { flowStateBarHeight, flowStateSelectedBarHeight } = config.styles

    const height = hovered || selected ? flowStateSelectedBarHeight : flowStateBarHeight

    bar.x = x
    bar.y = application.screen.height - height
    bar.width = width
    bar.height = height
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

  function startTicking(): void {
    application.ticker.add(tick)
  }

  function stopTicking(): void {
    application.ticker.remove(tick)
  }

  function tick(): void {
    render()
  }

  return {
    element,
    render,
  }
}