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
  const { element: icon, render: renderIcon } = await iconFactory()
  const { element: label, render: renderLabel } = await nodeLabelFactory()
  const { element: bar, render: renderBar } = await barFactory()

  let currentDate: Date | null = null
  let currentIds: string[] = []

  element.addChild(bar)

  content.addChild(icon)
  content.addChild(label)
  element.addChild(content)

  emitter.on('scaleUpdated', updated => scale = updated)

  application.ticker.add(() => {
    updatePosition()
  })

  async function render(props?: ArtifactClusterFactoryRenderProps): Promise<string[]> {
    if (!props) {
      currentDate = null
      currentIds = []
      element.visible = false
      return []
    }

    const { ids, date } = props

    await Promise.all([
      renderArtifactIcon(),
      renderLabelText(ids.length),
    ])

    await renderBg()

    currentDate = date
    currentIds = ids
    element.visible = true

    return ids
  }

  async function renderArtifactIcon(): Promise<Container> {
    const {
      artifactIconSize,
      artifactIconColor,
      artifactPaddingX,
      artifactPaddingY,
    } = config.styles

    const newIcon = await renderIcon('Artifact')

    newIcon.position = { x: artifactPaddingX, y: artifactPaddingY }
    newIcon.width = artifactIconSize
    newIcon.height = artifactIconSize
    newIcon.tint = artifactIconColor

    return newIcon
  }

  async function renderLabelText(count: number): Promise<BitmapText> {
    await renderLabel(count.toString())

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