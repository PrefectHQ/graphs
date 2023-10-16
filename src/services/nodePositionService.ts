import { ScaleLinear, ScaleTime, scaleLinear, scaleTime } from 'd3'
import { addSeconds } from 'date-fns'
import { Pixels, Position, SetHorizontalModeParameters, SetHorizontalModeTimeParameters, SetVerticalModeParameters } from '@/models/layout'
import { NodeOffsetService } from '@/services/nodeOffsetService'
import { exhaustive } from '@/utilities/exhaustive'

type LinearScale = ScaleLinear<number, number>
type TimeScale = ScaleTime<number, number>

const DEFAULT_COLUMN_SPAN_SECONDS = 1
const DEFAULT_TIME_COLUMN_SIZE_PIXELS = 20
const DEFAULT_LINEAR_COLUMN_SIZE_PIXELS = 200

export class NodePositionService {
  private yAxis: LinearScale | null = null
  private xAxis: LinearScale | TimeScale | null = null
  private readonly offsets = new NodeOffsetService()

  public setHorizontalMode(parameters: SetHorizontalModeParameters): void {
    const { mode } = parameters

    switch (mode) {
      case 'time':
        this.setXScaleTime(parameters)
        break
      case 'dag':
        this.setXScaleLinear()
        break
      default:
        exhaustive(mode)
    }
  }

  public setVerticalMode(parameters: SetVerticalModeParameters): void {
    const { mode } = parameters

    switch (mode) {
      case 'waterfall':
      case 'nearest-parent':
        this.setYScaleLinear(parameters)
        break
      default:
        exhaustive(mode)
    }
  }

  public setNodeOffset(...parameters: Parameters<NodeOffsetService['setOffset']>): void {
    this.offsets.setOffset(...parameters)
  }

  public removeNodeOffset(...parameters: Parameters<NodeOffsetService['removeOffset']>): void {
    this.offsets.removeOffset(...parameters)
  }

  public getPixelsFromXPosition(value: Position['x']): Pixels['x'] {
    if (!this.xAxis) {
      throw new Error('Axis not initialized')
    }

    return this.xAxis(value)
  }

  public getPixelsFromYPosition(value: Position['y']): Pixels['x'] {
    if (!this.yAxis) {
      throw new Error('Axis not initialized')
    }

    return this.yAxis(value) + this.offsets.getOffset(value)
  }

  public getPixelsFromPosition(position: Position): Pixels {
    return {
      y: this.getPixelsFromYPosition(position.y),
      x: this.getPixelsFromXPosition(position.x),
    }
  }

  public getPositionFromXPixels(value: Pixels['x']): Position['x'] {
    if (!this.xAxis) {
      throw new Error('Axis not initialized')
    }

    return this.xAxis.invert(value)
  }

  public getPositionFromYPixels(value: number): number {
    if (!this.yAxis) {
      throw new Error('Axis not initialized')
    }

    const maxValue = this.yAxis.invert(value)
    const [, rowHeight] = this.yAxis.range()
    // todo: this doesn't quite account for the offsets being "empty" space
    const range = Array.from({ length: maxValue }, (_element, index): [number, number] => {
      const startOffset = this.offsets.getTotalOffset(index)
      const start = index * rowHeight + startOffset

      const endOffset = this.offsets.getOffset(index)
      const end = start + rowHeight + endOffset

      return [start, end]
    }).flat()

    const axis = scaleLinear().domain([0, maxValue]).range(range)

    return axis.invert(value)
  }

  public getPositionFromPixels(pixels: Pixels): Position {
    const x = this.getPositionFromXPixels(pixels.x)
    const y = this.getPositionFromYPixels(pixels.y)

    return {
      x,
      y,
    }
  }

  private setXScaleTime({ startTime }: SetHorizontalModeTimeParameters): void {
    const start = startTime
    const end = addSeconds(start, DEFAULT_COLUMN_SPAN_SECONDS)

    // example: DEFAULT_COLUMN_SIZE_PIXELS = 20, start = "2023-01-01T00:00:00"
    // scale("2023-01-01T00:00:00") = 0
    // scale("2023-01-01T00:00:01") = 20
    // scale("2023-01-01T00:00:05") = 100
    this.xAxis = scaleTime().domain([start, end]).range([0, DEFAULT_TIME_COLUMN_SIZE_PIXELS])
  }

  private setXScaleLinear(): void {
    // example: DEFAULT_LINEAR_COLUMN_SIZE_PIXELS = 200
    // scale(0) === 0
    // scale(1) === 200
    // scale(5) === 1000
    this.yAxis = scaleLinear().domain([0, 1]).range([0, DEFAULT_LINEAR_COLUMN_SIZE_PIXELS])
  }

  private setYScaleLinear({ rowHeight }: { rowHeight: number }): void {
    // example: rowHeight = 20
    // scale(0) === 0
    // scale(1) === 20
    // scale(5) === 100
    this.yAxis = scaleLinear().domain([0, 1]).range([0, rowHeight])
  }
}