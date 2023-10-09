import isEqual from 'lodash.isequal'
import { waitForConfig } from '@/objects/config'
import { EventKey, emitter, waitForEvent } from '@/objects/events'
import { ScaleXDomain, ScaleYDomain } from '@/objects/scales'
import { waitForStage } from '@/objects/stage'
import { graphDataFactory } from '@/utilities/graphDataFactory'

export type RunGraphDomain = {
  x: ScaleXDomain,
  y: ScaleYDomain,
}

const { fetch: getData, stop: stopData } = graphDataFactory()

let domainX: ScaleXDomain | null = null
let domainY: ScaleYDomain | null = null
let domain: RunGraphDomain | null = null

export function startDomain(): void {
  startDomainX()
  startDomainY()
}

export function stopDomain(): void {
  domainX = null
  domainY = null
  domain = null
  stopData()
}

export function setDomain(value: Partial<RunGraphDomain>): void {
  if (isEqual(domain, value)) {
    return
  }

  const event: EventKey = domain ? 'domainUpdated' : 'domainCreated'
  const { x, y } = value

  if (x) {
    domainX = x
  }

  if (y) {
    domainY = y
  }

  if (domainX && domainY) {
    domain = {
      x: domainX,
      y: domainY,
    }

    emitter.emit(event, domain)
  }
}

export async function waitForDomain(): Promise<RunGraphDomain> {
  if (domain) {
    return domain
  }

  return await waitForEvent('domainCreated')
}

async function startDomainX(): Promise<void> {
  const config = await waitForConfig()

  getData(config.runId, ({ start_time, end_time }) => {
    if (domainX) {
      return
    }

    const start = start_time
    const end = end_time ?? new Date()
    const x: ScaleXDomain = [start, end]

    setDomain({ x })
  })
}

async function startDomainY(): Promise<void> {
  const stage = await waitForStage()
  const config = await waitForConfig()
  const start = 0
  const end = stage.clientHeight / config.styles.nodeHeight
  const y: ScaleYDomain = [start, end]

  setDomain({ y })
}