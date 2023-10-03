import { ScaleLinear, scaleLinear, scaleTime, ScaleTime } from 'd3'
import { emitter } from '@/objects/events'

export let scaleX: ScaleTime<number, number>
export type ScaleX = typeof scaleX

export let scaleY: ScaleLinear<number, number>
export type ScaleY = typeof scaleY

export type ScaleRange = [start: number, end: number]
export type ScaleXDomain = [start: Date, end: Date]
export type ScaleYDomain = [start: number, end: number]

export function startScales(): void {
  scaleX = scaleTime()
  scaleY = scaleLinear()

  emitter.on('stageUpdated', setScaleRanges)
}

type XScale = {
  domain?: ScaleXDomain,
  range?: ScaleRange,
}

// this needs to be clamped to some min/max range
export function setScaleX({ domain, range }: XScale): void {
  if (range) {
    scaleX.range(range)
  }

  if (domain) {
    scaleX.domain(domain)
  }

  if (range || domain) {
    emitter.emit('scaleUpdated', { scaleX, scaleY })
  }
}

type YScale = {
  domain?: ScaleYDomain,
  range?: ScaleRange,
}

// this needs to be clamped to some min/max range
export function setScaleY({ domain, range }: YScale): void {
  if (range) {
    scaleY.range(range)
  }

  if (domain) {
    scaleY.domain(domain)
  }

  if (range || domain) {
    emitter.emit('scaleUpdated', { scaleX, scaleY })
  }
}

function setScaleRanges(stage: HTMLDivElement): void {
  setScaleY({ range: [0, stage.clientWidth] })
  setScaleX({ range: [0, stage.clientHeight] })
}