import { waitForConfig } from '@/objects/config'
import { EventKey, emitter, waitForEvent } from '@/objects/events'
import { graphDataFactory } from '@/utilities/graphDataFactory'

export type RunGraphDomain = [start: Date, end: Date]

const { fetch: getData, stop: stopData } = graphDataFactory()

let domain: RunGraphDomain | null = null

export async function startDomain(): Promise<void> {
  const config = await waitForConfig()

  getGraphData(config.runId)

  emitter.on('configUpdated', config => getGraphData(config.runId))
}

export function stopDomain(): void {
  domain = null
  stopData()
}

function getGraphData(runId: string): void {
  getData(runId, ({ start_time, end_time }) => {
    const event: EventKey = domain ? 'domainUpdated' : 'domainCreated'

    const start = start_time
    const end = end_time ?? new Date()
    domain = [start, end]

    emitter.emit(event, domain)

  })
}

export async function waitForDomain(): Promise<RunGraphDomain> {
  if (domain) {
    return domain
  }

  return await waitForEvent('domainCreated')
}