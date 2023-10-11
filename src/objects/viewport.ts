import isEqual from 'lodash.isequal'
import { Viewport } from 'pixi-viewport'
import { watch } from 'vue'
import { RunGraphProps } from '@/models/RunGraph'
import { waitForApplication } from '@/objects/application'
import { waitForConfig } from '@/objects/config'
import { emitter, waitForEvent } from '@/objects/events'
import { waitForContainer } from '@/objects/nodes'
import { ScaleXDomain, waitForScales } from '@/objects/scales'
import { waitForScope } from '@/objects/scope'
import { waitForStage } from '@/objects/stage'

let viewport: Viewport | null = null
let viewportDateRange: ScaleXDomain | null = null

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
    .wheel()
    .decelerate({
      friction: 0.9,
    })

  application.stage.addChild(viewport)

  emitter.emit('viewportCreated', viewport)

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
  const container = await waitForContainer()
  const config = await waitForConfig()

  // when we get to culling we might need to turn it off for this measurement
  const { x, y, width, height } = container.getLocalBounds()
  const scale = viewport.findFit(width, height)

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

export function setViewportDateRange(value: ScaleXDomain): void {
  if (isEqual(viewportDateRange, value)) {
    return
  }

  viewportDateRange = value

  emitter.emit('viewportDateRangeUpdated', value)
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
  const { scaleX } = await waitForScales()
  const left = scaleX.invert(viewport.left)
  const right = scaleX.invert(viewport.right)

  setViewportDateRange([left, right])
}