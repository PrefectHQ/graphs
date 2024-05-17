import { CircularProgressBar } from '@pixi/ui'
import { waitForIconCull } from '@/objects/culling'

type CircularProgressBarOptions = {
  progress?: number,
  fillColor?: number,
  cullAtZoomThreshold?: boolean,
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export async function circularProgressBarFactory(options: CircularProgressBarOptions = {}) {
  const cull = await waitForIconCull()
  const element = new CircularProgressBar({
    backgroundColor: 0x000000,
    backgroundAlpha: 1,
    lineWidth: 20,
    fillColor: 0xFFFFFF,
    radius: 100,
    value: 100,
    cap: 'round',
  })

  if (options.cullAtZoomThreshold) {
    cull.add(element)
  }

  async function render(data): Promise<CircularProgressBar> {
    element.progress = data.progress
    await setTimeout(() => {}, 0)
    return element
  }

  return {
    element,
    render,
  }
}