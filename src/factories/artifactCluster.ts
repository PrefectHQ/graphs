import { BitmapText, Container } from 'pixi.js'
import { DEFAULT_ROOT_ARTIFACT_BOTTOM_OFFSET } from '@/consts'
import { barFactory } from '@/factories/bar'
import { iconFactory } from '@/factories/icon'
import { nodeLabelFactory } from '@/factories/label'
import { waitForApplication, waitForViewport } from '@/objects'
import { waitForConfig } from '@/objects/config'
import { emitter } from '@/objects/events'
import { waitForScale } from '@/objects/scale'

export type ArtifactClusterFactory = Awaited<ReturnType<typeof artifactClusterFactory>>

type ArtifactClusterFactoryRenderProps = {
  ids: string[],
  date: Date,
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export async function artifactClusterFactory() {
  const application = await waitForApplication()
  const viewport = await waitForViewport()
  const config = await waitForConfig()
  let scale = await waitForScale()

  const element = new Container()
  const content = new Container()
  const { element: icon, render: renderIcon } = await iconFactory({ cullAtZoomThreshold: false })
  const { element: label, render: renderLabel } = await nodeLabelFactory({ cullAtZoomThreshold: false })
  const { element: bar, render: renderBar } = await barFactory()

  let currentDate: Date | null = null
  let currentIds: string[] = []

  element.addChild(bar)

  content.addChild(icon)
  content.addChild(label)
  element.addChild(content)

  emitter.on('scaleUpdated', updated => scale = updated)
  emitter.on('viewportMoved', () => updatePosition())

  async function render(props?: ArtifactClusterFactoryRenderProps): Promise<string[]> {
    if (!props) {
      currentDate = null
      currentIds = []
      element.visible = false
      return []
    }

    const { ids, date } = props

    currentDate = date
    currentIds = ids

    await Promise.all([
      renderArtifactIcon(),
      renderLabelText(ids.length),
    ])

    await renderBg()

    element.visible = true

    updatePosition()

    return ids
  }

  async function renderArtifactIcon(): Promise<Container> {
    const {
      artifactIconSize,
      artifactIconColor,
      artifactPaddingLeft,
      artifactPaddingY,
    } = config.styles

    const newIcon = await renderIcon('Artifact')

    newIcon.position = { x: artifactPaddingLeft, y: artifactPaddingY }
    newIcon.width = artifactIconSize
    newIcon.height = artifactIconSize
    newIcon.tint = artifactIconColor

    return newIcon
  }

  async function renderLabelText(count: number): Promise<BitmapText> {
    await renderLabel(count.toString())

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

    return label
  }

  async function renderBg(): Promise<Container> {
    const {
      artifactPaddingLeft,
      artifactPaddingRight,
      artifactPaddingY,
      artifactBgColor,
      artifactBorderRadius,
    } = config.styles

    const barStyle = {
      width: artifactPaddingLeft + content.width + artifactPaddingRight,
      height: content.height + artifactPaddingY * 2,
      background: artifactBgColor,
      radius: artifactBorderRadius,
      capLeft: true,
      capRight: true,
    }

    return await renderBar(barStyle)
  }

  function updatePosition(): void {
    if (!currentDate) {
      return
    }

    const xPos = scale(currentDate) * viewport.scale._x + viewport.worldTransform.tx
    const x = xPos - element.width / 2
    const y = application.screen.height - element.height - DEFAULT_ROOT_ARTIFACT_BOTTOM_OFFSET

    element.position.set(x, y)
  }

  function getCurrentData(): ArtifactClusterFactoryRenderProps | null {
    if (!currentDate) {
      return null
    }

    return {
      ids: currentIds,
      date: currentDate,
    }
  }

  return {
    element,
    getCurrentData,
    render,
  }
}