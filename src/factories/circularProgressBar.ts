import { CircularProgressBar, MaskedProgressBarOptions } from '@pixi/ui'
import { Container } from 'pixi.js'
import { waitForIconCull } from '@/objects/culling'

type CircularProgressBarOptions = {
  progress?: number,
  fillColor?: number,
  cullAtZoomThreshold?: boolean,
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export async function circularProgressBarFactory(options: CircularProgressBarOptions = {}) {
  const cull = await waitForIconCull()
  const element = new Container()

  if (options.cullAtZoomThreshold) {
    cull.add(element)
  }

  function render(data: Partial<MaskedProgressBarOptions> & Pick<MaskedProgressBarOptions, 'lineWidth' | 'radius' | 'value'>): Promise<CircularProgressBar> {
    const circularProgressBar = new CircularProgressBar({
      backgroundColor: 0x000000,
      backgroundAlpha: 0.5,
      fillColor: 0xFFFFFF,
      value: 50,
      cap: 'round',
      ...data,
    })

    const size = (data.radius + data.lineWidth) * 2
    circularProgressBar.width = size
    circularProgressBar.height = size
    // normalize position from center to the top-left corner
    circularProgressBar.position.set(size / 2)

    return Promise.resolve(element.addChild(circularProgressBar))
  }

  return {
    element,
    render,
  }
}