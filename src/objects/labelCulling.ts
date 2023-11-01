import { DEFAULT_LABEL_CULLING_THRESHOLD } from '@/consts'
import { waitForApplication } from '@/objects/application'
import { waitForEvent } from '@/objects/events'
import { waitForViewport } from '@/objects/viewport'
import { VisibilityCull } from '@/services/visibilityCull'

let instance: VisibilityCull | null = null

export async function startLabelCulling(): Promise<void> {
  const viewport = await waitForViewport()
  const application = await waitForApplication()

  instance = new VisibilityCull()

  application.ticker.add(() => {
    if (viewport.dirty) {
      const visible = viewport.scale.x > DEFAULT_LABEL_CULLING_THRESHOLD

      instance?.toggle(visible)
    }
  })
}

export function stopLabelCulling(): void {
  instance?.clear()
  instance = null
}

export async function waitForLabelCull(): Promise<VisibilityCull> {
  if (instance) {
    return instance
  }

  return await waitForEvent('labelCullCreated')
}