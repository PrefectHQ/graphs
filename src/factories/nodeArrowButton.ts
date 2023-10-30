import { Container, ColorMatrixFilter, ColorSource } from 'pixi.js'
import { ArrowDirection, arrowFactory } from '@/factories/arrow'
import { barFactory } from '@/factories/bar'
import { borderFactory } from '@/factories/border'
import { waitForConfig } from '@/objects/config'

type NodeArrowBarStyles = {
  inside: boolean,
  background: ColorSource,
  isOpen: boolean,
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export async function nodeArrowButtonFactory() {
  const config = await waitForConfig()
  const container = new Container()
  const { element: arrow, render: renderArrow } = await arrowFactory()
  const { element: bar, render: renderBar } = await barFactory()
  const { element: border, render: renderBorder } = await borderFactory()
  const filter = new ColorMatrixFilter()

  container.eventMode = 'static'
  container.cursor = 'pointer'
  container.addChild(bar)
  container.addChild(arrow)
  container.addChild(border)

  container.on('mouseover', onMouseover)
  container.on('mouseout', onMouseout)

  bar.filters = [filter]

  border.visible = false

  async function render({ inside, isOpen, background }: NodeArrowBarStyles): Promise<Container> {
    const arrowStyles = {
      size: 10,
      stroke: 2,
      rotate: isOpen ? ArrowDirection.Up : ArrowDirection.Down,
    }

    const arrow = await renderArrow(arrowStyles)

    const buttonStyles = {
      width: config.styles.nodeToggleSize,
      height: config.styles.nodeToggleSize,
      background: inside ? background : '#333',
      radius: config.styles.nodeToggleBorderRadius,
    }

    const bar = await renderBar(buttonStyles)

    const border = await renderBorder({
      width: buttonStyles.width,
      height: buttonStyles.height,
      radius: buttonStyles.radius,
      stroke: 1,
      color: config.styles.nodeToggleBorderColor,
    })

    border.alpha = inside ? 0 : 1

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
    border.visible = true
  }

  function onMouseout(): void {
    filter.brightness(1, false)
    border.visible = false
  }

  return {
    element: container,
    render,
  }
}