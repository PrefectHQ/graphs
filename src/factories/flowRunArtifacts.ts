import throttle from 'lodash.throttle'
import { Container } from 'pixi.js'
import { DEFAULT_ROOT_COLLISION_THROTTLE, DEFAULT_ROOT_ARTIFACT_Z_INDEX } from '@/consts'
import { ArtifactFactory } from '@/factories/artifact'
import { ArtifactClusterFactory } from '@/factories/artifactCluster'
import { flowRunArtifactFactory } from '@/factories/flowRunArtifact'
import { Artifact } from '@/models'
import { waitForApplication, waitForViewport } from '@/objects'
import { waitForConfig } from '@/objects/config'
import { emitter } from '@/objects/events'
import { layout, waitForSettings } from '@/objects/settings'
import { clusterHorizontalCollisions } from '@/utilities/detectHorizontalCollisions'

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export async function flowRunArtifactsFactory() {
  const application = await waitForApplication()
  const viewport = await waitForViewport()
  const config = await waitForConfig()
  const settings = await waitForSettings()

  const artifacts: Map<string, ArtifactFactory> = new Map()
  const clusterNodes: ArtifactClusterFactory[] = []
  let availableClusterNodes: ArtifactClusterFactory[] = []

  let container: Container | null = null
  let internalData: Artifact[] | null = null
  let nonTemporalAlignmentEngaged = false

  emitter.on('viewportMoved', () => update())

  async function render(newData?: Artifact[]): Promise<void> {
    if (container) {
      container.visible = !settings.disableArtifacts
    }

    if (settings.disableArtifacts) {
      return
    }

    if (newData) {
      internalData = newData
    }

    if (!internalData) {
      return
    }

    if (!container) {
      createContainer()
    }

    const promises: Promise<void>[] = []

    for (const artifact of internalData) {
      promises.push(createArtifact(artifact))
    }

    await Promise.all(promises)
  }

  async function createArtifact(artifact: Artifact): Promise<void> {
    if (artifacts.has(artifact.id)) {
      return artifacts.get(artifact.id)!.render()
    }

    const factory = await flowRunArtifactFactory({ type: 'artifact', artifact })

    artifacts.set(artifact.id, factory)

    container!.addChild(factory.element)

    return factory.render()
  }

  function createContainer(): void {
    container = new Container()
    container.zIndex = DEFAULT_ROOT_ARTIFACT_Z_INDEX
    application.stage.addChild(container)
  }

  function update(): void {
    if (!container || settings.disableArtifacts) {
      return
    }

    if (!layout.isTemporal()) {
      if (!nonTemporalAlignmentEngaged) {
        clearClusters()
        alignNonTemporal()
        nonTemporalAlignmentEngaged = true
      }

      container.position.x = viewport.scale._x + viewport.worldTransform.tx
      return
    }

    nonTemporalAlignmentEngaged = false
    container.position.x = 0
    checkLayout()
  }

  const checkLayout = throttle(async () => {
    availableClusterNodes = [...clusterNodes]

    await clusterHorizontalCollisions({
      items: artifacts,
      createCluster,
    })

    for (const cluster of availableClusterNodes) {
      cluster.render()
    }
  }, DEFAULT_ROOT_COLLISION_THROTTLE)

  async function createCluster(): Promise<ArtifactClusterFactory> {
    if (availableClusterNodes.length > 0) {
      return availableClusterNodes.pop()!
    }

    const newCluster = await flowRunArtifactFactory({ type: 'cluster' })
    container!.addChild(newCluster.element)
    clusterNodes.push(newCluster)

    return newCluster
  }

  function clearClusters(): void {
    for (const cluster of clusterNodes) {
      cluster.render()
    }
    for (const artifact of artifacts.values()) {
      artifact.element.visible = true
    }
  }

  function alignNonTemporal(): void {
    const { artifactContentGap } = config.styles
    let x = 0

    for (const artifact of artifacts.values()) {

      artifact.element.x = x
      x += artifact.element.width + artifactContentGap
    }
  }

  return {
    render,
  }
}