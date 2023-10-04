import { ScaleLinear, scaleLinear, scaleTime, ScaleTime } from 'd3'
import { emitter, waitForEvent } from '@/objects/events'

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

export function startScales(): void {
  emitter.on('stageUpdated', setScaleRanges)
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
  const isUpdate = initialized()

  if (x) {
    setScaleX(x)
  }

  if (y) {
    setScaleY(y)
  }

  if (initialized()) {
    if (isUpdate) {
      emitter.emit('scalesUpdated', { scaleX, scaleY })
      return
    }

    emitter.emit('scalesCreated', { scaleX, scaleY })
  }
}

export function initialized(): boolean {
  return scaleXDomainInitialized && scaleXRangeInitialized && scaleYDomainInitialized && scaleYRangeInitialized
}

function setScaleRanges(stage: HTMLDivElement): void {
  setScales({
    x: {
      range: [0, stage.clientWidth],
    },
    y: {
      range: [0, stage.clientHeight],
    },
  })
}

export async function waitForScales(): Promise<Scales> {
  if (initialized()) {
    return await { scaleX, scaleY }
  }

  return waitForEvent('scalesCreated')
}