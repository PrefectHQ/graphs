import isEqual from 'lodash.isequal'
import { watch } from 'vue'
import { waitForConfig } from '@/objects/config'
import { EventKey, emitter, waitForEvent } from '@/objects/events'
import { ScaleXDomain, ScaleYDomain } from '@/objects/scales'
import { waitForScope } from '@/objects/scope'
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

export function startDomain(domain: () => RunGraphDomain | undefined): void {
  const value = domain()

  if (value) {
    setDomain(value)
  }

  watchDomain(domain)
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
  const { x = domainX, y = domainY } = value

  if (isEqual(x, domainX) && isEqual(y, domainY)) {
    return
  }

  const event: EventKey = domain ? 'domainUpdated' : 'domainCreated'

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

async function watchDomain(domain: () => RunGraphDomain | undefined): Promise<void> {
  const scope = await waitForScope()

  scope.run(() => {
    watch(domain, value => {
      if (value) {
        setDomain(value)
      }
    })
  })
}

async function startDomainX(): Promise<void> {
  if (domainX) {
    return
  }

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
  if (domainY) {
    return
  }

  const stage = await waitForStage()
  const config = await waitForConfig()
  const start = 0
  const end = stage.clientHeight / config.styles.nodeHeight
  const y: ScaleYDomain = [start, end]

  setDomain({ y })
}