import isEqual from 'lodash.isequal'
import { Viewport } from 'pixi-viewport'
import { watch } from 'vue'
import { waitForApplication } from '@/objects/application'
import { emitter, waitForEvent } from '@/objects/events'
import { ScaleXDomain, waitForScales } from '@/objects/scales'
import { waitForScope } from '@/objects/scope'

let viewport: Viewport | null = null
let viewportDateRange: ScaleXDomain | null = null

export async function startViewport(visibleDateRange: () => ScaleXDomain | undefined): Promise<void> {
  const application = await waitForApplication()

  viewport = new Viewport({
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

  watchVisibleDateRange(visibleDateRange)
  startViewportDateRange()
}

export function stopViewport(): void {
  viewport = null
  viewportDateRange = null
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

async function watchVisibleDateRange(visibleDateRange: () => ScaleXDomain | undefined): Promise<void> {
  const scope = await waitForScope()

  scope.run(() => {
    watch(visibleDateRange, value => {
      if (value) {
        setViewportDateRange(value)
      }
    })
  })
}

async function startViewportDateRange(): Promise<void> {
  const viewport = await waitForViewport()
  const { scaleX } = await waitForScales()

  viewport.on('moved', event => {
    const left = scaleX.invert(event.viewport.left)
    const right = scaleX.invert(event.viewport.right)

    setViewportDateRange([left, right])
  })
}