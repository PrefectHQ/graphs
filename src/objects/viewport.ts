import isEqual from 'lodash.isequal'
import { Viewport } from 'pixi-viewport'
import { DEFAULT_NODES_CONTAINER_NAME } from '@/consts'
import { ViewportDateRange } from '@/models/viewport'
import { waitForApplication } from '@/objects/application'
import { waitForConfig } from '@/objects/config'
import { cull, uncull } from '@/objects/culling'
import { emitter, waitForEvent } from '@/objects/events'
import { waitForScale } from '@/objects/scale'
import { waitForSettings } from '@/objects/settings'
import { waitForStage } from '@/objects/stage'

let viewport: Viewport | null = null
let viewportDateRange: ViewportDateRange | null = null

export async function startViewport(): Promise<void> {
  const application = await waitForApplication()
  const stage = await waitForStage()

  viewport = new Viewport({
    screenHeight: stage.clientHeight,
    screenWidth: stage.clientWidth,
    events: application.renderer.events,
    passiveWheel: false,
  })

  // ensures the viewport is above the guides
  viewport.zIndex = 1

  viewport
    .drag()
    .pinch()
    .wheel({
      trackpadPinch: true,
    })
    .decelerate({
      friction: 0.9,
    })
    .clampZoom({
      minWidth: stage.clientWidth / 2,
    })

  application.stage.addChild(viewport)

  emitter.emit('viewportCreated', viewport)
  emitter.on('applicationResized', resizeViewport)
  emitter.on('scaleUpdated', () => updateViewportDateRange())

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

  const guidesOffset = config.styles.guideTextSize + config.styles.guideTextTopPadding

  uncull()
  const { x, y, width, height } = container.getLocalBounds()
  const widthWithGap = width + config.styles.columnGap * 2
  const heightWithGap = height + config.styles.rowGap * 2 + guidesOffset * 2
  const scale = viewport.findFit(widthWithGap, heightWithGap)

  // if the container doesn't have a size we cannot do anything here
  if (!width || !height) {
    return
  }

  viewport.animate({
    position: {
      x: x + width / 2,
      y: y + height / 2 - guidesOffset,
    },
    scale: scale <= 1 ? scale : 1,
    time: animate ? config.animationDuration : 0,
    ease: 'easeInOutQuad',
    removeOnInterrupt: true,
    callbackOnComplete: () => {
      cull()
      updateViewportDateRange()
    },
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

async function startViewportDateRange(): Promise<void> {
  const viewport = await waitForViewport()

  updateViewportDateRange()

  viewport.on('moved', () => updateViewportDateRange())
}

async function updateViewportDateRange(): Promise<void> {
  const range = await getViewportDateRange()

  if (!range) {
    return
  }

  setViewportDateRange(range)
}

async function getViewportDateRange(): Promise<ViewportDateRange | null> {
  const viewport = await waitForViewport()
  const scale = await waitForScale()
  const start = scale.invert(viewport.left)
  const end = scale.invert(viewport.right)

  if (start instanceof Date && end instanceof Date) {
    return [start, end]
  }

  return null
}

export async function updateViewportFromDateRange(value: ViewportDateRange | undefined): Promise<void> {
  const range = await getViewportDateRange()
  const settings = await waitForSettings()

  if (value === undefined || settings.isDependency() || isEqual(value, range)) {
    return
  }

  const viewport = await waitForViewport()
  const scale = await waitForScale()
  const [start, end] = value
  const left = scale(start)
  const right = scale(end)
  const centerX = left + (right - left) / 2

  setViewportDateRange(value)

  viewport.fitWidth(right - left, true)
  viewport.moveCenter(centerX, viewport.center.y)
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