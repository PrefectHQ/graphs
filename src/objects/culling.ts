import { Cull } from '@pixi-essentials/cull'
import { DEFAULT_EDGE_CULLING_THRESHOLD, DEFAULT_LABEL_CULLING_THRESHOLD } from '@/consts'
import { waitForApplication } from '@/objects/application'
import { emitter, waitForEvent } from '@/objects/events'
import { waitForViewport } from '@/objects/viewport'
import { VisibilityCull } from '@/services/visibilityCull'

let viewportCuller: Cull | null = null
let labelCuller: VisibilityCull | null = null
let edgeCuller: VisibilityCull | null = null

export async function startCulling(): Promise<void> {
  const viewport = await waitForViewport()
  const application = await waitForApplication()

  // this cull uses renderable so any other custom logic for showing or hiding must use
  // the "visible" property or this will interfere
  viewportCuller = new Cull({
    toggle: 'renderable',
  })

  labelCuller = new VisibilityCull()
  edgeCuller = new VisibilityCull()

  application.ticker.add(() => {
    if (viewport.dirty) {
      const edgesVisible = viewport.scale.x > DEFAULT_EDGE_CULLING_THRESHOLD
      const labelsVisible = viewport.scale.x > DEFAULT_LABEL_CULLING_THRESHOLD

      edgeCuller?.toggle(edgesVisible)
      labelCuller?.toggle(labelsVisible)
      viewportCuller?.cull(application.renderer.screen)

      viewport.dirty = false
    }
  })

  emitter.emit('cullCreated', viewportCuller)
}

export function stopCulling(): void {
  viewportCuller = null
  labelCuller?.clear()
  labelCuller = null
  edgeCuller?.clear()
  edgeCuller = null
}

export async function cull(): Promise<void> {
  const viewport = await waitForViewport()

  viewport.dirty = true
}

export function uncull(): void {
  if (viewportCuller) {
    viewportCuller.uncull()
  }
}

export async function waitForCull(): Promise<Cull> {
  if (viewportCuller) {
    return viewportCuller
  }

  return await waitForEvent('cullCreated')
}

export async function waitForEdgeCull(): Promise<VisibilityCull> {
  if (edgeCuller) {
    return edgeCuller
  }

  return await waitForEvent('edgeCullCreated')
}

export async function waitForLabelCull(): Promise<VisibilityCull> {
  if (labelCuller) {
    return labelCuller
  }

  return await waitForEvent('labelCullCreated')
}