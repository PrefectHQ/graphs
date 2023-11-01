import { guidesFactory } from '@/factories/guides'
import { waitForApplication } from '@/objects/application'

export async function startGuides(): Promise<void> {
  const application = await waitForApplication()
  const { element, render } = await guidesFactory()

  application.stage.addChild(element)

  render()
}

export function stopGuides(): void {
  // nothing to stop
}