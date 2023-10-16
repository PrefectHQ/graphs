import { waitForConfig } from '@/objects/config'
import { waitForViewport } from '@/objects/viewport'
import { NodesContainerService } from '@/services/nodesContainerService'

let service: NodesContainerService | null = null

export async function startNodes(): Promise<void> {
  const viewport = await waitForViewport()
  const config = await waitForConfig()

  service = new NodesContainerService({
    runId: config.runId,
    parent: viewport,
  })
}

export function stopNodes(): void {
  service = null
}