import { ArtifactFactory } from '@/factories/artifact'
import { artifactNodeFactory } from '@/factories/artifactNode'
import { emitter } from '@/objects/events'
import { isSelected } from '@/objects/selection'

export type ArtifactClusterFactory = Awaited<ReturnType<typeof artifactClusterFactory>>

export type ArtifactClusterFactoryRenderProps = {
  ids: string[],
  date: Date,
}

export function isArtifactClusterFactory(
  factory: ArtifactFactory | ArtifactClusterFactory,
): factory is ArtifactClusterFactory {
  return 'isCluster' in factory
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export async function artifactClusterFactory() {
  const { element, render: renderArtifactNode } = await artifactNodeFactory({ cullAtZoomThreshold: false })

  let currentDate: Date | null = null
  let currentIds: string[] = []
  let selected = false

  element.eventMode = 'static'
  element.cursor = 'pointer'

  emitter.on('itemSelected', () => {
    const isCurrentlySelected = isSelected({ kind: 'artifacts', ids: currentIds })

    if (isCurrentlySelected !== selected && currentDate) {
      selected = isCurrentlySelected
      render({ ids: currentIds, date: currentDate })
    }
  })

  async function render(props?: ArtifactClusterFactoryRenderProps): Promise<void> {
    if (!props) {
      currentDate = null
      currentIds = []
      element.visible = false
      return
    }

    const { ids, date } = props
    currentDate = date
    currentIds = ids

    await renderArtifactNode({ selected, type: 'unknown', name: ids.length.toString() })
    element.visible = true
  }

  function getSelected(): boolean {
    return selected
  }

  function getDate(): Date | null {
    return currentDate
  }

  function getIds(): string[] {
    return currentIds
  }

  return {
    element,
    render,
    getSelected,
    getDate,
    getIds,
    isCluster: true,
  }
}