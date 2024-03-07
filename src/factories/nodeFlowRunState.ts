import { ColorSource, Container } from 'pixi.js'
import { FlowRunStateFactory } from '@/factories/flowRunState'
import { rectangleFactory } from '@/factories/rectangle'
import { RunGraphStateEvent } from '@/models/states'
import { waitForApplication, waitForViewport } from '@/objects'
import { waitForConfig } from '@/objects/config'
import { emitter } from '@/objects/events'
import { waitForRunData } from '@/objects/nodes'
import { waitForScale } from '@/objects/scale'
import { isSelected, selectItem } from '@/objects/selection'
import { layout } from '@/objects/settings'

export type NodeFlowRunStateFactory = Awaited<ReturnType<typeof nodeFlowRunStateFactory>>

export function isNodeFlowRunStateFactory(
  factory: NodeFlowRunStateFactory | FlowRunStateFactory,
): factory is NodeFlowRunStateFactory {
  return 'isNodesFlowRunStateFactory' in factory
}

export type NodeFlowRunStateFactoryRenderProps = {
  end?: Date,
  parentStartDate?: Date,
  width?: number,
  height?: number,
}

type StateRectangleRenderProps = {
  x: number,
  width: number,
  background: ColorSource,
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export async function nodeFlowRunStateFactory(state: RunGraphStateEvent) {
  const application = await waitForApplication()
  const viewport = await waitForViewport()
  const config = await waitForConfig()
  const data = await waitForRunData()
  let scale = await waitForScale()

  const element = new Container()
  const bar = await rectangleFactory()
  const area = await rectangleFactory()

  let end: Date | null = null
  let parentStart: Date | null = null
  let parentWidth = 0
  let parentHeight = 0
  let hovered = false
  let selected = false

  element.visible = false
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
  bar.on('click', clickEvent => {
    clickEvent.stopPropagation()
    const barPosition = bar.getGlobalPosition()

    const position = {
      x: barPosition.x,
      y: barPosition.y,
      width: bar.width * viewport.scale.x,
      height: bar.height * viewport.scale.y,
    }

    selectItem({ ...state, kind: 'state', position })
  })

  area.eventMode = 'none'
  area.cursor = 'default'

  emitter.on('scaleUpdated', updated => {
    scale = updated
    render()
  })
  emitter.on('itemSelected', () => {
    const isCurrentlySelected = isSelected({ kind: 'state', ...state })

    if (isCurrentlySelected !== selected) {
      selected = isCurrentlySelected
      // clear the hovered state to account for the popover div
      // that prevents the mouseleave event in prefect-ui-library
      hovered = false
      render()
    }
  })

  if (state.type === 'RUNNING' && !data.end_time) {
    startTicking()
  }

  function render(props?: NodeFlowRunStateFactoryRenderProps): void {
    const { end: newEnd, parentStartDate, width, height } = props ?? {}

    if (newEnd) {
      end = newEnd
    }
    if (parentStartDate) {
      parentStart = parentStartDate
    }
    if (width) {
      parentWidth = width
    }
    if (height) {
      parentHeight = height
    }

    if (data.end_time) {
      stopTicking()
    }

    if (!layout.isTemporal()) {
      element.visible = false
      return
    }

    if (!end && state.type !== 'RUNNING') {
      return
    }

    if (!parentStart || parentWidth <= 0) {
      element.visible = false
      return
    }

    const options = getRenderStyles()

    renderBar(options)
    renderArea(options)

    element.visible = true
  }

  function getRenderStyles(): StateRectangleRenderProps {
    const { background = '#fff' } = config.styles.state(state)

    let startX = scale(state.timestamp) - scale(parentStart!)

    if (startX < 0) {
      startX = 0
    }

    const endX = end ? scale(end) - scale(parentStart!) : parentWidth - startX
    const width = endX - startX

    return {
      x: startX,
      width: Math.max(width, 0),
      background,
    }
  }

  function renderBar({ x, width, background }: StateRectangleRenderProps): void {
    const { flowStateBarHeight, flowStateSelectedBarHeight } = config.styles

    const height = hovered || selected ? flowStateSelectedBarHeight : flowStateBarHeight

    bar.x = x
    bar.y = parentHeight - height
    bar.width = width
    bar.height = height
    bar.tint = background
  }

  function renderArea({ x, width, background }: StateRectangleRenderProps): void {
    const { flowStateBarHeight, flowStateAreaAlpha, nodeHeight } = config.styles

    const topOffset = nodeHeight / 2

    area.x = x
    area.y = topOffset
    area.width = width
    area.height = parentHeight - flowStateBarHeight - topOffset
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
    isNodesFlowRunStateFactory: true,
  }
}