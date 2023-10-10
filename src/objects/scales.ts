import { ScaleLinear, scaleLinear, scaleTime, ScaleTime } from 'd3'
import { addSeconds } from 'date-fns'
import { waitForConfig } from '@/objects/config'
import { emitter, EventKey, waitForEvent } from '@/objects/events'
import { graphDataFactory } from '@/utilities/graphDataFactory'

export type Scales = { scaleX: ScaleX, scaleY: ScaleY }
export type ScaleX = ScaleTime<number, number>
export let scaleX: ScaleX = scaleTime()
let scaleXInitialized: boolean = false

export type ScaleY = ScaleLinear<number, number>
export let scaleY: ScaleY = scaleLinear()
let scaleYInitialized: boolean = false

export type ScaleRange = [start: number, end: number]
export type ScaleXDomain = [start: Date, end: Date]
export type ScaleYDomain = [start: number, end: number]

const { fetch: getData, stop: stopData } = graphDataFactory()
const DEFAULT_COLUMN_SPAN_SECONDS = 1
const DEFAULT_COLUMN_SIZE_PIXELS = 20

export function startScales(): void {
  startScaleX()
  startScaleY()
}

export function stopScales(): void {
  scaleX = scaleTime()
  scaleY = scaleLinear()
  scaleXInitialized = false
  scaleYInitialized = false
}

async function startScaleX(): Promise<void> {
  const config = await waitForConfig()

  getData(config.runId, ({ start_time }) => {
    const start = start_time
    const end = addSeconds(start, DEFAULT_COLUMN_SPAN_SECONDS)

    // example: DEFAULT_COLUMN_SIZE_PIXELS = 20, start = "2023-01-01T00:00:00"
    // scale("2023-01-01T00:00:00") = 0
    // scale("2023-01-01T00:00:01") = 20
    // scale("2023-01-01T00:00:05") = 100
    setScaleX({
      domain: [start, end],
      range: [0, DEFAULT_COLUMN_SIZE_PIXELS],
    })

    stopData()
  })

}

async function startScaleY(): Promise<void> {
  const config = await waitForConfig()

  // example: nodeHeight = 20
  // scale(0) === 0
  // scale(1) === 20
  // scale(5) === 100
  setScaleY({
    domain: [0, 1],
    range: [0, config.styles.nodeHeight],
  })
}

type XScale = {
  domain: ScaleXDomain,
  range: ScaleRange,
}

function setScaleX({ domain, range }: XScale): void {
  const event = getEvent()

  scaleX.range(range)
  scaleX.domain(domain)
  scaleXInitialized = true

  if (initialized()) {
    emitter.emit(event, { scaleX, scaleY })
  }
}

type YScale = {
  domain: ScaleYDomain,
  range: ScaleRange,
}

function setScaleY({ domain, range }: YScale): void {
  const event = getEvent()

  scaleY.range(range)
  scaleY.domain(domain)
  scaleYInitialized = true

  if (initialized()) {
    emitter.emit(event, { scaleX, scaleY })
  }
}

function getEvent(): EventKey {
  return initialized() ? 'scalesUpdated' : 'scalesCreated'
}

export function initialized(): boolean {
  return scaleXInitialized && scaleYInitialized
}

export async function waitForScales(): Promise<Scales> {
  if (initialized()) {
    return { scaleX, scaleY }
  }

  return await waitForEvent('scalesCreated')
}