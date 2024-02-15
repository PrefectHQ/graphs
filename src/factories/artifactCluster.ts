import { artifactNodeFactory } from '@/factories/artifactNode'
import { emitter } from '@/objects/events'
import { isSelected, selectItem } from '@/objects/selection'

export type ArtifactClusterFactory = Awaited<ReturnType<typeof artifactClusterFactory>>

export type ArtifactClusterFactoryRenderProps = {
  ids: string[],
  date: Date,
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export async function artifactClusterFactory() {
  const { element, render: renderArtifactNode } = await artifactNodeFactory({ cullAtZoomThreshold: false })

  let currentDate: Date | null = null
  let currentIds: string[] = []
  let selected = false

  element.eventMode = 'static'
  element.cursor = 'pointer'

  element.on('click', event => {
    event.stopPropagation()
    selectItem({ kind: 'artifactCluster', ids: currentIds })
  })
  emitter.on('itemSelected', () => {
    const isCurrentlySelected = isSelected({ kind: 'artifactCluster', ids: currentIds })

    if (isCurrentlySelected !== selected && currentDate) {
      selected = isCurrentlySelected
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
    currentDate = date
    currentIds = ids

    await renderArtifactNode({ selected, type: 'unknown', name: ids.length.toString() })
    element.visible = true

    return ids
  }

  return {
    element,
    render,
  }
}