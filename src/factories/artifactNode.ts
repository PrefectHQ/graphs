import { Container } from 'pixi.js'
import { artifactBarFactory } from '@/factories/artifactBar'
import { circularProgressBarFactory } from '@/factories/circularProgressBar'
import { iconFactory } from '@/factories/icon'
import { nodeLabelFactory } from '@/factories/label'
import { ArtifactType, RunGraphArtifact, RunGraphArtifactTypeAndData, artifactTypeIconMap } from '@/models'
import { waitForConfig } from '@/objects/config'

type ArtifactNodeFactoryOptions = {
  cullAtZoomThreshold?: boolean,
  artifact: RunGraphArtifact,
}

type ArtifactNodeFactoryRenderOptions = {
  selected?: boolean,
  name?: string,
  type: ArtifactType,
} & RunGraphArtifactTypeAndData

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export async function artifactNodeFactory({ cullAtZoomThreshold, artifact }: ArtifactNodeFactoryOptions) {
  const config = await waitForConfig()

  const element = new Container()
  const content = new Container()
  const { element: icon, render: renderIcon } = await iconFactory({ cullAtZoomThreshold })
  const { element: circularProgressBar, render: renderCircularProgressbar } = await circularProgressBarFactory()
  const { element: label, render: renderLabel } = await nodeLabelFactory({ cullAtZoomThreshold })
  const { element: bar, render: renderBar } = await artifactBarFactory()

  let selected = false
  let name = artifact.key
  let { type } = artifact

  if (type === 'progress') {
    content.addChild(circularProgressBar)
  } else {
    content.addChild(icon)
  }
  content.addChild(label)
  element.addChild(bar)
  element.addChild(content)

  async function render(options?: ArtifactNodeFactoryRenderOptions): Promise<Container> {
    if (options) {
      const { selected: newSelected, name: newName, type: newType } = options
      selected = newSelected ?? selected
      name = newName ?? name
      type = newType
    }

    if (options?.type === 'progress') {
      await Promise.all([
        renderProgressArtifact(options.data),
        renderArtifactNode(),
      ])
    } else {
      await Promise.all([
        renderArtifactIcon(),
        renderArtifactNode(),
      ])
    }

    await renderBg(artifact)

    return element
  }

  async function renderArtifactIcon(): Promise<Container> {
    if (type === 'progress') {
      return icon
    }

    const iconName = artifactTypeIconMap[type]
    const {
      artifactIconSize,
      artifactIconColor,
      artifactPaddingLeft,
      artifactPaddingY,
    } = config.styles

    const newIcon = await renderIcon(iconName)

    newIcon.position = { x: artifactPaddingLeft, y: artifactPaddingY }
    newIcon.width = artifactIconSize
    newIcon.height = artifactIconSize
    newIcon.tint = artifactIconColor

    return newIcon
  }

  // eslint-disable-next-line require-await
  async function renderProgressArtifact(data: number): Promise<Container> {
    const {
      artifactPaddingLeft,
      artifactPaddingRight,
      artifactPaddingY,
      artifactIconSize,
    } = config.styles

    const lineWidth = 20
    const radius = (artifactIconSize - lineWidth * 2) / 2
    const newDynamicArtifact = renderCircularProgressbar({
      value: data,
      radius,
      lineWidth,
    })

    if (name) {
      newDynamicArtifact.position.x += artifactPaddingLeft
    } else {
      // Without a name/text label, uneven left/right padding should be normalized
      // so that the progress bar is centered
      newDynamicArtifact.position.x += (artifactPaddingLeft + artifactPaddingRight) / 2
    }
    newDynamicArtifact.position.y += artifactPaddingY

    return circularProgressBar
  }

  async function renderArtifactNode(): Promise<Container> {
    if (!name) {
      label.visible = false
      return label
    }

    await renderLabel(name)

    const {
      artifactPaddingLeft,
      artifactPaddingY,
      artifactTextColor,
      artifactIconSize,
      artifactContentGap,
    } = config.styles

    const contentGap = name ? artifactContentGap : 0
    const x = artifactPaddingLeft + artifactIconSize + contentGap
    const y = artifactPaddingY

    label.tint = artifactTextColor
    label.scale.set(0.75)
    label.position = { x, y }
    label.visible = true

    return label
  }

  async function renderBg(): Promise<Container> {
    const {
      artifactPaddingLeft,
      artifactPaddingRight,
      artifactPaddingY,
    } = config.styles

    const options = {
      selected: selected,
      width: content.width + artifactPaddingLeft + artifactPaddingRight,
      height: content.height + artifactPaddingY * 2,
    }

    return await renderBar(options)
  }

  return {
    element,
    render,
  }
}