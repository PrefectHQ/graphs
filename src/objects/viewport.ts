import isEqual from 'lodash.isequal'
import { Viewport } from 'pixi-viewport'
import { watch } from 'vue'
import { DEFAULT_NODES_CONTAINER_NAME } from '@/consts'
import { RunGraphProps } from '@/models/RunGraph'
import { ViewportDateRange } from '@/models/viewport'
import { waitForApplication } from '@/objects/application'
import { waitForConfig } from '@/objects/config'
import { uncull } from '@/objects/culling'
import { emitter, waitForEvent } from '@/objects/events'
import { waitForScale } from '@/objects/scale'
import { waitForScope } from '@/objects/scope'
import { waitForStage } from '@/objects/stage'

let viewport: Viewport | null = null
let viewportDateRange: ViewportDateRange | null = null

export async function startViewport(props: RunGraphProps): Promise<void> {
  const application = await waitForApplication()
  const stage = await waitForStage()

  viewport = new Viewport({
    screenHeight: stage.clientHeight,
    screenWidth: stage.clientWidth,
    events: application.renderer.events,
    passiveWheel: false,
  })

  viewport
    .drag()
    .pinch()
    .wheel({
      trackpadPinch: true,
    })
    .decelerate({
      friction: 0.9,
    })

  application.stage.addChild(viewport)

  emitter.emit('viewportCreated', viewport)
  emitter.on('applicationResized', resizeViewport)

  watchVisibleDateRange(props)
  startViewportDateRange()
}

export function stopViewport(): void {
  viewport = null
  viewportDateRange = null
}

type CenterViewportParameters = {
  animate?: boolean,
}

export async function centerViewport({ animate }: CenterViewportParameters = {}): Promise<void> {
  const viewport = await waitForViewport()
  const config = await waitForConfig()
  const container = viewport.getChildByName(DEFAULT_NODES_CONTAINER_NAME)

  if (!container) {
    throw new Error('Nodes container not found')
  }

  uncull()
  const { x, y, width, height } = container.getLocalBounds()
  const widthWithGap = width + config.styles.columnGap * 2
  const heightWithGap = height + config.styles.rowGap * 2
  const scale = viewport.findFit(widthWithGap, heightWithGap)

  // if the container doesn't have a size we cannot do anything here
  if (!width || !height) {
    return
  }

  viewport.animate({
    position: {
      x: x + width / 2,
      y: y + height / 2,
    },
    scale,
    time: animate ? config.animationDuration : 0,
    callbackOnComplete: () => updateViewportDateRange(),
  })

}

export async function waitForViewport(): Promise<Viewport> {
  if (viewport) {
    return viewport
  }

  return await waitForEvent('viewportCreated')
}

export function setViewportDateRange(value: ViewportDateRange): void {
  if (isEqual(viewportDateRange, value)) {
    return
  }

  viewportDateRange = value

  emitter.emit('viewportDateRangeUpdated', value)
}

type MoveViewportCenterOptions = {
  xOffset: number,
  yOffset: number,
}

export function moveViewportCenter({ xOffset, yOffset }: MoveViewportCenterOptions): void {
  if (!viewport) {
    return
  }

  const { x: xPos, y: yPos } = viewport.transform.position

  viewport.setTransform(
    xPos + xOffset,
    yPos + yOffset,
    viewport.transform.scale.x,
    viewport.transform.scale.y,
  )
}

async function watchVisibleDateRange(props: RunGraphProps): Promise<void> {
  const scope = await waitForScope()

  scope.run(() => {
    watch(() => props.viewport, value => {
      if (value) {
        setViewportDateRange(value)
      }
    })
  })
}

async function startViewportDateRange(): Promise<void> {
  const viewport = await waitForViewport()

  updateViewportDateRange()

  viewport.on('moved', () => updateViewportDateRange())
}

async function updateViewportDateRange(): Promise<void> {
  const viewport = await waitForViewport()
  const scale = await waitForScale()
  const left = scale.invert(viewport.left)
  const right = scale.invert(viewport.right)

  if (left instanceof Date && right instanceof Date) {
    setViewportDateRange([left, right])
  }

}

async function resizeViewport(): Promise<void> {
  const application = await waitForApplication()
  const viewport = await waitForViewport()
  const stage = await waitForStage()

  const originalWidth = viewport.screenWidth
  const originalHeight = viewport.screenHeight
  const newWidth = stage.clientWidth
  const newHeight = stage.clientHeight
  const xOffset = (newWidth - originalWidth) / 2
  const yOffset = (newHeight - originalHeight) / 2

  viewport.resize(application.screen.width, application.screen.height)

  moveViewportCenter({
    xOffset,
    yOffset,
  })
}