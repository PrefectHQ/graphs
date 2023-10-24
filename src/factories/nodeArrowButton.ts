import { Container, ColorMatrixFilter } from 'pixi.js'
import { ArrowDirection, ArrowStyle, arrowFactory } from '@/factories/arrow'
import { BarStyle, barFactory } from '@/factories/bar'

type NodeArrowBarStyles = {
  arrow: Omit<ArrowStyle, 'rotate'>,
  button: BarStyle,
  isOpen: boolean,
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export async function nodeArrowButtonFactory() {
  const container = new Container()
  const { arrow, render: renderArrow } = await arrowFactory()
  const { bar, render: renderBar } = await barFactory()
  const filter = new ColorMatrixFilter()

  container.eventMode = 'static'
  container.cursor = 'pointer'
  container.addChild(bar)
  container.addChild(arrow)

  container.on('mouseover', onMouseover)
  container.on('mouseout', onMouseout)

  bar.filters = [filter]

  async function render({ arrow: arrowStyles, button: buttonStyles, isOpen }: NodeArrowBarStyles): Promise<Container> {
    const rotate = isOpen ? ArrowDirection.Up : ArrowDirection.Down
    const arrow = await renderArrow({ ...arrowStyles, rotate })
    const bar = await renderBar(buttonStyles)

    const middle = {
      y: bar.height / 2,
      x: bar.width / 2,
    }

    const offset = arrowStyles.size / 4

    arrow.x = middle.x
    arrow.y = isOpen ? middle.y + offset : middle.y - offset

    return container
  }

  function onMouseover(): void {
    filter.brightness(0.5, false)
  }

  function onMouseout(): void {
    filter.brightness(1, false)
  }

  return {
    container,
    render,
  }
}