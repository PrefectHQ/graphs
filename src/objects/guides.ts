import { guidesFactory } from '@/factories/guides'
import { waitForApplication } from '@/objects/application'
import { emitter } from '@/objects/events'

export async function startGuides(): Promise<void> {
  const application = await waitForApplication()
  const { element, render } = await guidesFactory()

  application.stage.addChild(element)

  render()

  emitter.on('viewportDateRangeUpdated', () => render())
  emitter.on('layoutUpdated', () => render())
}

export function stopGuides(): void {
  // nothing to stop
}