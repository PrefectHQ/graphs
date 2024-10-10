import { playheadFactory } from '@/factories/playhead'
import { GraphData } from '@/models/Graph'
import { waitForApplication } from '@/objects/application'
import { emitter } from '@/objects/events'

export async function startPlayhead(data: GraphData): Promise<void> {
  const application = await waitForApplication()
  const { element: playhead, render } = await playheadFactory()

  if (!data.end) {
    application.stage.addChild(playhead)
    application.ticker.add(render)
  }

  emitter.on('graphDataUpdated', ({ end }) => {
    if (end) {
      application.ticker.remove(render)
      application.stage.removeChild(playhead)
    }
  })
}

export function stopPlayhead(): void {
  // do nothing
}