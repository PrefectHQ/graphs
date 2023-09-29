import { ScaleLinear, scaleLinear } from 'd3'
import { application } from '@/objects/application'

export let scaleX: ScaleLinear<number, number>
export let scaleY: ScaleLinear<number, number>

export function createScales(): void {
  createScaleX()
  createScaleY()
}

export function createScaleX(): void {
  scaleX = scaleLinear().range([0, application.view.width]).domain([0, 100])
}

export function createScaleY(): void {
  scaleY = scaleLinear().range([0, application.view.height]).domain([0, 100])
}

export function setScaleXZoom(zoom: number): void {

  const start = 0
  const interval = application.view.width * 0.2
  const rangeEnd = application.view.width + zoom * interval
  console.log(zoom, rangeEnd)

  scaleX.range([start, rangeEnd])
}