import { DEFAULT_EDGE_CULLING_THRESHOLD } from '@/consts'
import { waitForApplication } from '@/objects/application'
import { waitForEvent } from '@/objects/events'
import { waitForViewport } from '@/objects/viewport'
import { VisibilityCull } from '@/services/visibilityCull'

let instance: VisibilityCull | null = null

export async function startEdgeCulling(): Promise<void> {
  const viewport = await waitForViewport()
  const application = await waitForApplication()

  instance = new VisibilityCull()

  application.ticker.add(() => {
    if (viewport.dirty) {
      const visible = viewport.scale.x > DEFAULT_EDGE_CULLING_THRESHOLD

      instance?.toggle(visible)
    }
  })
}

export function stopEdgeCulling(): void {
  instance?.clear()
  instance = null
}

export async function waitForEdgeCull(): Promise<VisibilityCull> {
  if (instance) {
    return instance
  }

  return await waitForEvent('edgeCullCreated')
}