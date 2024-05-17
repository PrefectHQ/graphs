import { Container } from 'pixi.js'
import { artifactBarFactory } from '@/factories/artifactBar'
import { circularProgressBarFactory } from '@/factories/circularProgressBar'
import { iconFactory } from '@/factories/icon'
import { nodeLabelFactory } from '@/factories/label'
import { ArtifactType, RunGraphArtifactProgressData, artifactTypeIconMap } from '@/models'
import { waitForConfig } from '@/objects/config'

type ArtifactNodeFactoryOptions = {
  cullAtZoomThreshold?: boolean,
}

type ArtifactNodeFactoryRenderOptions = {
  selected?: boolean,
  name?: string,
  type?: ArtifactType,
  data?: Record<string, unknown>,
} | {
  selected?: boolean,
  name?: string,
  type: 'progress',
  data: RunGraphArtifactProgressData,
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export async function artifactNodeFactory({ cullAtZoomThreshold }: ArtifactNodeFactoryOptions) {
  const config = await waitForConfig()

  const element = new Container()
  const content = new Container()
  const { element: icon, render: renderIcon } = await iconFactory({ cullAtZoomThreshold })
  const { element: circularProgressBar, render: renderCircularProgressbar } = await circularProgressBarFactory()
  const { element: label, render: renderLabel } = await nodeLabelFactory({ cullAtZoomThreshold })
  const { element: bar, render: renderBar } = await artifactBarFactory()

  let selected = false
  let name: string | null = null
  let type: ArtifactType | null = null
  let data: Record<string, unknown> | null = null

  content.addChild(icon)
  content.addChild(label)
  content.addChild(circularProgressBar)

  element.addChild(bar)
  element.addChild(content)

  async function render(options?: ArtifactNodeFactoryRenderOptions): Promise<Container> {
    if (options) {
      const { selected: newSelected, name: newName, type: newType, data: newData } = options
      selected = newSelected ?? selected
      name = newName ?? name
      type = newType ?? type
      data = newData ?? data
    }

    if (type !== 'progress') {
      await Promise.all([
        renderArtifactIcon(),
        renderArtifactNode(),
      ])
    } else {
      await Promise.all([
        renderProgressArtifact(data),
        renderArtifactNode(),
      ])
    }

    await renderBg()

    return element
  }

  async function renderArtifactIcon(): Promise<Container> {
    if (!type) {
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
  async function renderProgressArtifact(data: RunGraphArtifactProgressData): Promise<Container> {
    // FIXME: hacky workaround. the unrendered icon element is increasing the content's height
    content.removeChild(icon)
    const {
      artifactPaddingLeft,
      // artifactPaddingRight,
      artifactPaddingY,
      artifactIconSize,
    } = config.styles

    const lineWidth = 2
    const radius = (artifactIconSize - lineWidth * 2) / 2
    const newDynamicArtifact = await renderCircularProgressbar({
      value: data.progress,
      radius,
      lineWidth,
    })
    console.log('width', newDynamicArtifact.width, 'height', newDynamicArtifact.height)

    newDynamicArtifact.position.x += artifactPaddingLeft
    // to horizontally center with uneven horizontal padding (if only rendering the progress bar)
    // newDynamicArtifact.position.x += (artifactPaddingLeft + artifactPaddingRight) / 2
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

    const x = artifactPaddingLeft + artifactIconSize + artifactContentGap
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