import { waitForConfig } from '@/objects/config'
import { emitter, waitForEvent } from '@/objects/events'
import { layout } from '@/objects/layout'
import { NodePositionService } from '@/services/nodePositionService'

let service: NodePositionService | null = null

export async function startScales(): Promise<void> {
  const config = await waitForConfig()
  const data = await config.fetch(config.runId)

  service = new NodePositionService()

  service.setHorizontalMode({
    mode: layout.horizontal,
    startTime: data.start_time,
  })

  service.setVerticalMode({
    mode: layout.vertical,
    rowHeight: config.styles.nodeHeight,
  })

  emitter.emit('scalesCreated', service)
}

export function stopScales(): void {
  service = null
}


export async function waitForScales(): Promise<NodePositionService> {
  if (service) {
    return service
  }

  return await waitForEvent('scalesCreated')
}