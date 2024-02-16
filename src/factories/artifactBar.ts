import { Container } from 'pixi.js'
import { barFactory } from '@/factories/bar'
import { selectedBorderFactory } from '@/factories/selectedBorder'
import { waitForConfig } from '@/objects/config'

type ArtifactBarFactoryRenderProps = {
  selected: boolean,
  width: number,
  height: number,
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export async function artifactBarFactory() {
  const config = await waitForConfig()
  const container = new Container()
  const { element: bar, render: renderBar } = await barFactory()
  const { element: border, render: renderBorder } = await selectedBorderFactory()

  container.addChild(bar)
  container.addChild(border)

  async function render({ selected, width, height }: ArtifactBarFactoryRenderProps): Promise<Container> {
    const {
      artifactBgColor,
      artifactBorderRadius,
    } = config.styles

    const barStyle = {
      width,
      height,
      background: artifactBgColor,
      radius: artifactBorderRadius,
      capLeft: true,
      capRight: true,
    }

    await Promise.all([
      renderBar(barStyle),
      renderBorder({ selected, width, height }),
    ])

    return container
  }

  return {
    element: container,
    render,
  }
}