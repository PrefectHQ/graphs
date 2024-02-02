import { BitmapText, Container } from 'pixi.js'
import { barFactory } from '@/factories/bar'
import { nodeLabelFactory } from '@/factories/label'
import { Artifact } from '@/models/artifact'
import { waitForConfig } from '@/objects/config'
import { waitForCull } from '@/objects/culling'

export type ArtifactFactory = Awaited<ReturnType<typeof artifactFactory>>

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export async function artifactFactory(artifact: Artifact) {
  const element = new Container()
  const content = new Container()
  const config = await waitForConfig()
  const cull = await waitForCull()
  const { element: label, render: renderLabel } = await nodeLabelFactory()
  const { element: bar, render: renderBar } = await barFactory()

  element.addChild(bar)

  content.addChild(label)
  element.addChild(content)

  cull.add(element)

  async function render(): Promise<Container> {
    await renderLabelText()

    await renderBg()

    return element
  }

  async function renderLabelText(): Promise<BitmapText> {
    if (!artifact.key) {
      return label
    }

    await renderLabel(artifact.key)

    const { artifactPaddingX, artifactPaddingY, artifactTextColor } = config.styles

    label.tint = artifactTextColor
    label.scale.set(0.75)
    label.position = {
      x: artifactPaddingX,
      y: artifactPaddingY,
    }

    return label
  }

  async function renderBg(): Promise<Container> {
    const {
      artifactPaddingX,
      artifactPaddingY,
      artifactBgColor,
      artifactBorderRadius,
    } = config.styles

    const barStyle = {
      width: content.width + artifactPaddingX * 2,
      height: content.height + artifactPaddingY * 2,
      background: artifactBgColor,
      radius: artifactBorderRadius,
      capLeft: true,
      capRight: true,
    }

    return await renderBar(barStyle)
  }

  return {
    element,
    render,
  }
}