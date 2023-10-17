import { waitForConfig } from '@/objects/config'
import { centerViewport, waitForViewport } from '@/objects/viewport'
import { NodesContainerService } from '@/services/nodesContainerService'

let service: NodesContainerService | null = null

export async function startNodes(): Promise<void> {
  const viewport = await waitForViewport()
  const config = await waitForConfig()

  service = new NodesContainerService({
    runId: config.runId,
    parent: viewport,
  })

  const center = (): void => {
    centerViewport()
    service?.emitter.off('rendered', center)
  }

  service.emitter.on('rendered', center)
}

export function stopNodes(): void {
  service = null
}