import { ScaleLinear, scaleLinear } from 'd3'
import { application } from '@/objects/application'
import { emitter } from '@/objects/events'

export let scaleX: ScaleLinear<number, number>
export let scaleY: ScaleLinear<number, number>

// these are the same for now but  ScaleXDomain will eventually be [Date, Date]
type ScaleRange = [start: number, end: number]
type ScaleXDomain = [start: number, end: number]
type ScaleYDomain = [start: number, end: number]

export function createScales(): void {
  createScaleX()
  createScaleY()
}

export function createScaleX(): void {
  const range: ScaleRange = [0, application.view.width]
  const domain: ScaleXDomain = [0, 100]

  scaleX = scaleLinear()

  setScaleX({ range, domain, silent: true })
}

type XScale = {
  domain?: ScaleXDomain,
  range?: ScaleRange,
  silent?: boolean,
}

// this needs to be clamped to some minimum range
export function setScaleX({ domain, range, silent }: XScale): void {
  if (range) {
    scaleX.range(range)
  }

  if (domain) {
    scaleX.domain(domain)
  }

  if (!silent && (range || domain)) {
    emitter.emit('scaleXUpdated')
  }
}

export function createScaleY(): void {
  const range: ScaleRange = [0, application.view.height]
  const domain: ScaleYDomain = [0, 100]

  scaleY = scaleLinear()

  setScaleY({ range, domain, silent: true })
}

type YScale = {
  domain?: ScaleYDomain,
  range?: ScaleRange,
  silent?: boolean,
}

// this needs to be clamped to some minimum range
export function setScaleY({ domain, range, silent }: YScale): void {
  if (range) {
    scaleY.range(range)
  }

  if (domain) {
    scaleY.domain(domain)
  }

  if (!silent && (range || domain)) {
    emitter.emit('scaleYUpdated')
  }
}

// proof of concept based on a static number
// my guess is rather than accepting a static zoom
// the multiplier would be accepted so a scroll event could pass a positive or negative value
export function setScaleXZoom(zoom: number): void {
  const multiplier = 0.2
  const interval = application.view.width * multiplier
  const rangeEnd = application.view.width + zoom * interval
  const range: ScaleRange = [0, rangeEnd]

  setScaleX({ range })
}