import { HorizontalScale, horizontalScaleFactory } from '@/factories/position'
import { horizontalSettingsFactory } from '@/factories/settings'
import { waitForConfig } from '@/objects/config'
import { emitter, waitForEvent } from '@/objects/events'

let scale: HorizontalScale | null = null

export async function startScale(): Promise<void> {
  const config = await waitForConfig()
  const data = await config.fetch(config.runId)
  const settings = await horizontalSettingsFactory(data.start_time)

  scale = await horizontalScaleFactory(settings)

  emitter.emit('scaleCreated', scale)
}

export function stopScale(): void {
  scale = null
}


export async function waitForScale(): Promise<HorizontalScale> {
  if (scale) {
    return scale
  }

  return await waitForEvent('scaleCreated')
}