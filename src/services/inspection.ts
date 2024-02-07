import { Artifact } from '@/models'
import { emitter } from '@/objects/events'
import { getSelected, selectNode } from '@/objects/selection'

export function inspectArtifact(artifact: Artifact): void {
  const selectedNode = getSelected()

  if (selectedNode && !selectedNode.artifacts?.includes(artifact)) {
    selectNode(null)
  }

  emitter.emit('inspectArtifact', { id: artifact.id })
}