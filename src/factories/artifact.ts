import { Container } from 'pixi.js'
import { artifactNodeFactory } from '@/factories/artifactNode'
import { Artifact } from '@/models/artifact'
import { emitter } from '@/objects/events'
import { isSelected, selectItem } from '@/objects/selection'

export type ArtifactFactory = Awaited<ReturnType<typeof artifactFactory>>

type ArtifactFactoryOptions = {
  cullAtZoomThreshold?: boolean,
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export async function artifactFactory(artifact: Artifact, { cullAtZoomThreshold = true }: ArtifactFactoryOptions = {}) {
  const { element, render: renderArtifactNode } = await artifactNodeFactory({ cullAtZoomThreshold })

  let selected = false

  element.eventMode = 'static'
  element.cursor = 'pointer'

  element.on('click', event => {
    event.stopPropagation()
    selectItem({ kind: 'artifact', id: artifact.id })
  })

  emitter.on('itemSelected', () => {
    const isCurrentlySelected = isSelected({ kind: 'artifact', id: artifact.id })

    if (isCurrentlySelected !== selected) {
      selected = isCurrentlySelected
      render()
    }
  })

  async function render(): Promise<void> {
    await renderArtifactNode({ selected, name: artifact.key, type: artifact.type })
  }

  function getSelected(): boolean {
    return selected
  }

  function getDate(): Date {
    return artifact.created
  }

  function getId(): string {
    return artifact.id
  }

  return {
    element,
    render,
    getSelected,
    getDate,
    getId,
  }
}