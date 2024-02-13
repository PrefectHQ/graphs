import { BitmapText, Container } from 'pixi.js'
import { DEFAULT_ROOT_ARTIFACT_BOTTOM_OFFSET } from '@/consts'
import { barFactory } from '@/factories/bar'
import { iconFactory } from '@/factories/icon'
import { nodeLabelFactory } from '@/factories/label'
import { selectedBorderFactory } from '@/factories/selectedBorder'
import { waitForApplication, waitForViewport } from '@/objects'
import { waitForConfig } from '@/objects/config'
import { emitter } from '@/objects/events'
import { waitForScale } from '@/objects/scale'
import { isSelected, selectItem } from '@/objects/selection'

export type ArtifactClusterFactory = Awaited<ReturnType<typeof artifactClusterFactory>>

type ArtifactClusterFactoryRenderProps = {
  ids: string[],
  date: Date,
}

type ArtifactClusterFactoryRenderBgProps = {
  width: number,
  height: number,
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
  const { element: border, render: renderBorder } = await selectedBorderFactory()

  let currentDate: Date | null = null
  let currentIds: string[] = []
  let isClusterSelected = false

  element.addChild(bar)
  element.addChild(border)

  content.addChild(icon)
  content.addChild(label)
  element.addChild(content)

  element.eventMode = 'static'
  element.cursor = 'pointer'

  element.on('click', event => {
    event.stopPropagation()
    selectItem({ kind: 'artifactCluster', ids: currentIds })
  })

  emitter.on('scaleUpdated', updated => scale = updated)
  emitter.on('viewportMoved', () => updatePosition())
  emitter.on('itemSelected', () => {
    const isCurrentlySelected = isSelected(currentIds)

    if (isCurrentlySelected !== isClusterSelected && currentDate) {
      isClusterSelected = isCurrentlySelected
      render({ ids: currentIds, date: currentDate })
    }
  })

  async function render(props?: ArtifactClusterFactoryRenderProps): Promise<string[]> {
    if (!props) {
      currentDate = null
      currentIds = []
      element.visible = false
      return []
    }

    const { ids, date } = props
    const {
      artifactPaddingLeft,
      artifactPaddingRight,
      artifactPaddingY,
    } = config.styles

    currentDate = date
    currentIds = ids

    await Promise.all([
      renderArtifactIcon(),
      renderLabelText(ids.length),
    ])

    const width = artifactPaddingLeft + content.width + artifactPaddingRight
    const height = content.height + artifactPaddingY * 2

    await Promise.all([
      renderBg({ width, height }),
      renderBorder({ item: currentIds, width, height }),
    ])

    updatePosition()

    element.visible = true

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

  async function renderBg({ width, height }: ArtifactClusterFactoryRenderBgProps): Promise<Container> {
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

    return await renderBar(barStyle)
  }

  function updatePosition(): void {
    if (!currentDate) {
      return
    }

    let selectedOffset = 0

    if (isClusterSelected) {
      const { selectedBorderOffset, selectedBorderWidth } = config.styles
      selectedOffset = selectedBorderOffset + selectedBorderWidth * 2
    }

    const x = scale(currentDate) * viewport.scale._x + viewport.worldTransform.tx
    const centeredX = x - (element.width - selectedOffset) / 2
    const y = application.screen.height - (element.height - selectedOffset) - DEFAULT_ROOT_ARTIFACT_BOTTOM_OFFSET

    element.position.set(centeredX, y)
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