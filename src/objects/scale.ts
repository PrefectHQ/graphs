import { HorizontalScale, horizontalScaleFactory } from '@/factories/position'
import { horizontalSettingsFactory } from '@/factories/settings'
import { EventKey, emitter, waitForEvent } from '@/objects/events'
import { waitForRunData } from '@/objects/nodes'
import { waitForSettings } from '@/objects/settings'

let scale: HorizontalScale | null = null

export async function startScale(): Promise<void> {
  const data = await waitForRunData()

  setHorizontalScale(data.start_time)

  emitter.on('layoutUpdated', () => setHorizontalScale(data.start_time))
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

async function setHorizontalScale(startTime: Date): Promise<void> {
  // makes sure the initial horizontal scale multiplier is set prior to creating this scale
  await waitForSettings()

  const event: EventKey = scale ? 'scaleUpdated' : 'scaleCreated'
  const settings = horizontalSettingsFactory(startTime)

  scale = horizontalScaleFactory(settings)

  emitter.emit(event, scale)
}