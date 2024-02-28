import throttle from 'lodash.throttle'
import { Container } from 'pixi.js'
import { DEFAULT_ROOT_ARTIFACT_COLLISION_THROTTLE, DEFAULT_ROOT_ARTIFACT_Z_INDEX } from '@/consts'
import { ArtifactFactory } from '@/factories/artifact'
import { ArtifactClusterFactory } from '@/factories/artifactCluster'
import { flowRunArtifactFactory, FlowRunArtifactFactory } from '@/factories/flowRunArtifact'
import { RunGraphArtifact } from '@/models'
import { waitForApplication, waitForViewport } from '@/objects'
import { waitForConfig } from '@/objects/config'
import { emitter } from '@/objects/events'
import { layout, waitForSettings } from '@/objects/settings'

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export async function flowRunArtifactsFactory() {
  const application = await waitForApplication()
  const viewport = await waitForViewport()
  const config = await waitForConfig()
  const settings = await waitForSettings()

  const artifacts: Map<string, ArtifactFactory> = new Map()
  const clusterNodes: ArtifactClusterFactory[] = []

  let container: Container | null = null
  let internalData: RunGraphArtifact[] | null = null
  let nonTemporalAlignmentEngaged = false

  emitter.on('viewportMoved', () => update())

  async function render(newData?: RunGraphArtifact[]): Promise<void> {
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

  async function createArtifact(artifact: RunGraphArtifact): Promise<void> {
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
    const visibleItems = [...artifacts.values()]
    const availableClusterNodes = [...clusterNodes]
    visibleItems.sort((itemA, itemB) => itemA.element.x - itemB.element.x)

    await checkCollisions(visibleItems, availableClusterNodes)

    for (const cluster of availableClusterNodes) {
      cluster.render()
    }
  }, DEFAULT_ROOT_ARTIFACT_COLLISION_THROTTLE)

  async function checkCollisions(
    visibleItems: FlowRunArtifactFactory[],
    availableClusterNodes: ArtifactClusterFactory[],
    startIndex?: number,
  ): Promise<void> {
    let checkpoint
    let prevIndex: number | null = null
    let collisionIndex: number | null = null

    for (let i = startIndex ?? 0; i < visibleItems.length; i++) {
      const item = visibleItems[i]
      const itemX = item.element.x
      item.element.visible = true

      if (prevIndex !== null && checkpoint && itemX < checkpoint) {
        collisionIndex = i
        break
      }

      prevIndex = i
      checkpoint = itemX + item.element.width
    }

    if (collisionIndex !== null && prevIndex !== null) {
      const prevItem = visibleItems[prevIndex]
      const collisionItem = visibleItems[collisionIndex]

      prevItem.element.visible = false
      collisionItem.element.visible = false

      const cluster = await clusterItems(prevItem, collisionItem, availableClusterNodes)

      if (cluster) {
        visibleItems.splice(prevIndex, 1, cluster)
        visibleItems.splice(collisionIndex, 1)
      }

      checkCollisions(visibleItems, availableClusterNodes, prevIndex)
    }
  }

  async function clusterItems(
    prevItem: ArtifactFactory | ArtifactClusterFactory,
    currentItem: ArtifactFactory | ArtifactClusterFactory,
    availableClusterNodes: ArtifactClusterFactory[],
  ): Promise<FlowRunArtifactFactory | null> {
    const prevDate = prevItem.getDate()
    const currentDate = currentItem.getDate()
    const prevIds = 'getId' in prevItem ? [prevItem.getId()] : prevItem.getIds()
    const currentIds = 'getId' in currentItem ? [currentItem.getId()] : currentItem.getIds()

    if (!prevDate || !currentDate) {
      console.error('flowRunArtifacts: visible item is missing date')
      return null
    }

    let clusterNode: FlowRunArtifactFactory

    if ('isCluster' in prevItem) {
      clusterNode = prevItem
    } else if ('isCluster' in currentItem) {
      clusterNode = currentItem
    } else if (availableClusterNodes.length > 0) {
      clusterNode = availableClusterNodes.pop()!
    } else {
      const newCluster = await flowRunArtifactFactory({ type: 'cluster' })
      container!.addChild(newCluster.element)
      clusterNodes.push(newCluster)

      clusterNode = newCluster
    }

    const ids = [...prevIds, ...currentIds]
    const date = getCenteredDate(ids)

    clusterNode.render({ ids, date })

    return clusterNode
  }

  function getCenteredDate(ids: string[]): Date {
    const times = ids.reduce((acc: number[], id) => {
      const artifact = artifacts.get(id)

      if (artifact) {
        acc.push(artifact.getDate().getTime())
      }

      return acc
    }, [])

    const min = Math.min(...times)
    const max = Math.max(...times)

    return new Date((min + max) / 2)
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