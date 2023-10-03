import { ScaleLinear, scaleLinear, scaleTime, ScaleTime } from 'd3'
import { emitter } from '@/objects/events'

export let scaleX: ScaleTime<number, number>
export type ScaleX = typeof scaleX

export let scaleY: ScaleLinear<number, number>
export type ScaleY = typeof scaleY

type ScaleRange = [start: number, end: number]
type ScaleXDomain = [start: Date, end: Date]
type ScaleYDomain = [start: number, end: number]


export function startScales(): void {
  scaleX = scaleTime()
  scaleY = scaleLinear()

  emitter.on('stageCreated', updateScaleRanges)
  emitter.on('stageResized', updateScaleRanges)
}

type XScale = {
  domain?: ScaleXDomain,
  range?: ScaleRange,
  silent?: boolean,
}

// this needs to be clamped to some min/max range
export function setScaleX({ domain, range, silent }: XScale): void {
  if (range) {
    scaleX.range(range)
  }

  if (domain) {
    scaleX.domain(domain)
  }

  if (!silent && (range || domain)) {
    emitter.emit('scaleXUpdated', scaleX)
  }
}

type YScale = {
  domain?: ScaleYDomain,
  range?: ScaleRange,
  silent?: boolean,
}

// this needs to be clamped to some min/max range
export function setScaleY({ domain, range, silent }: YScale): void {
  if (range) {
    scaleY.range(range)
  }

  if (domain) {
    scaleY.domain(domain)
  }

  if (!silent && (range || domain)) {
    emitter.emit('scaleYUpdated', scaleY)
  }
}

export function updateScaleRanges(stage: HTMLDivElement): void {
  setScaleY({ range: [0, stage.clientWidth] })
  setScaleX({ range: [0, stage.clientHeight] })
}