import { ScaleLinear, scaleLinear, scaleTime, ScaleTime } from 'd3'
import { RunGraphDomain, waitForDomain } from '@/objects/domain'
import { emitter, EventKey, waitForEvent } from '@/objects/events'
import { waitForStage } from '@/objects/stage'

export type Scales = { scaleX: ScaleX, scaleY: ScaleY }
export type ScaleX = ScaleTime<number, number>
export let scaleX: ScaleX = scaleTime()
let scaleXDomainInitialized: boolean = false
let scaleXRangeInitialized: boolean = false

export type ScaleY = ScaleLinear<number, number>
// scale y domain isn't a concept yet
export let scaleY: ScaleY = scaleLinear().domain([1, 100])
// fix this later
let scaleYDomainInitialized: boolean = true
let scaleYRangeInitialized: boolean = false

export type ScaleRange = [start: number, end: number]
export type ScaleXDomain = [start: Date, end: Date]
export type ScaleYDomain = [start: number, end: number]

export async function startScales(): Promise<void> {
  const stage = await waitForStage()
  setScaleRangesFromStage(stage)

  const domain = await waitForDomain()
  setScaleDomain(domain)

  emitter.on('domainUpdated', setScaleDomain)
  emitter.on('stageUpdated', setScaleRangesFromStage)
}

export function stopScales(): void {
  scaleX = scaleTime()
  scaleY = scaleLinear().domain([1, 100])
  scaleXDomainInitialized = false
  scaleXRangeInitialized = false
  scaleYDomainInitialized = true
  scaleYRangeInitialized = false
}

type XScale = {
  domain?: ScaleXDomain,
  range?: ScaleRange,
}

// this needs to be clamped to some min/max range
function setScaleX({ domain, range }: XScale): void {
  if (range) {
    scaleX.range(range)
    scaleXRangeInitialized = true
  }

  if (domain) {
    scaleX.domain(domain)
    scaleXDomainInitialized = true
  }
}

type YScale = {
  domain?: ScaleYDomain,
  range?: ScaleRange,
}

// this needs to be clamped to some min/max range
function setScaleY({ domain, range }: YScale): void {
  if (range) {
    scaleY.range(range)
    scaleYRangeInitialized = true
  }

  if (domain) {
    scaleY.domain(domain)
    scaleYDomainInitialized = true
  }
}

export function setScales({ x, y }: { x?: XScale, y?: YScale }): void {
  const event: EventKey = initialized() ? 'scalesUpdated' : 'scalesCreated'

  if (x) {
    setScaleX(x)
  }

  if (y) {
    setScaleY(y)
  }

  if (initialized()) {
    emitter.emit(event, { scaleX, scaleY })
  }
}

export function initialized(): boolean {
  return scaleXDomainInitialized && scaleXRangeInitialized && scaleYDomainInitialized && scaleYRangeInitialized
}

function setScaleRangesFromStage(stage: HTMLDivElement): void {
  setScales({
    x: {
      range: [0, stage.clientWidth],
    },
    y: {
      range: [0, stage.clientHeight],
    },
  })
}

function setScaleDomain(domain: RunGraphDomain): void {
  setScales({ x: { domain } })
}

export async function waitForScales(): Promise<Scales> {
  if (initialized()) {
    return { scaleX, scaleY }
  }

  return await waitForEvent('scalesCreated')
}