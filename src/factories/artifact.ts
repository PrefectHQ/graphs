import { BitmapText, Container } from 'pixi.js'
import { barFactory } from '@/factories/bar'
import { iconFactory } from '@/factories/icon'
import { nodeLabelFactory } from '@/factories/label'
import { Artifact, artifactTypeIconMap } from '@/models/artifact'
import { waitForConfig } from '@/objects/config'
import { waitForCull } from '@/objects/culling'

export type ArtifactFactory = Awaited<ReturnType<typeof artifactFactory>>

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export async function artifactFactory(artifact: Artifact) {
  const element = new Container()
  const content = new Container()
  const config = await waitForConfig()
  const cull = await waitForCull()
  const { element: icon, render: renderIcon } = await iconFactory()
  const { element: label, render: renderLabel } = await nodeLabelFactory()
  const { element: bar, render: renderBar } = await barFactory()

  element.addChild(bar)

  content.addChild(icon)
  content.addChild(label)
  element.addChild(content)

  cull.add(element)

  async function render(): Promise<Container> {
    await Promise.all([
      renderArtifactIcon(),
      renderLabelText(),
    ])

    await renderBg()

    return element
  }

  async function renderArtifactIcon(): Promise<Container> {
    const iconName = artifactTypeIconMap[artifact.type]
    const {
      artifactIconSize,
      artifactIconColor,
      artifactPaddingX,
      artifactPaddingY,
    } = config.styles

    const newIcon = await renderIcon(iconName)

    newIcon.position = { x: artifactPaddingX, y: artifactPaddingY }
    newIcon.width = artifactIconSize
    newIcon.height = artifactIconSize
    newIcon.tint = artifactIconColor

    return newIcon
  }

  async function renderLabelText(): Promise<BitmapText> {
    if (!artifact.key) {
      return label
    }

    await renderLabel(artifact.key)

    const {
      artifactPaddingX,
      artifactPaddingY,
      artifactTextColor,
      artifactIconSize,
      artifactContentGap,
    } = config.styles

    const x = artifactPaddingX + artifactIconSize + artifactContentGap
    const y = artifactPaddingY

    label.tint = artifactTextColor
    label.scale.set(0.75)
    label.position = { x, y }

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