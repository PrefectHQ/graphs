import { Container } from 'pixi.js'
import { artifactBarFactory } from '@/factories/artifactBar'
import { circularProgressBarFactory } from '@/factories/circularProgressBar'
import { iconFactory } from '@/factories/icon'
import { nodeLabelFactory } from '@/factories/label'
import { ArtifactType, artifactTypeIconMap } from '@/models'
import { waitForConfig } from '@/objects/config'

type ArtifactNodeFactoryOptions = {
  cullAtZoomThreshold?: boolean,
}

type ArtifactNodeFactoryRenderOptions = {
  selected?: boolean,
  name?: string,
  type?: ArtifactType,
  data?: Record<string, unknown>,
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

    const promises = [renderArtifactNode()]
    if (type !== 'progress') {
      promises.push(renderArtifactIcon())
    } else {
      promises.push(renderDynamicArtifact({ data: options?.data }))
    }
    await Promise.all(promises)

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
  async function renderDynamicArtifact(data): Promise<Container> {
    const {
      artifactPaddingLeft,
      artifactPaddingY,
      artifactIconSize,
    } = config.styles

    const newDynamicArtifact = await renderCircularProgressbar(data)

    // newDynamicArtifact.position = { x: artifactPaddingLeft, y: artifactPaddingY }
    newDynamicArtifact.position = { x: 10, y: 10 }
    // newDynamicArtifact.width = artifactIconSize
    // newDynamicArtifact.height = artifactIconSize

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