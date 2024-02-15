import debounce from 'lodash.debounce'
import { Container } from 'pixi.js'
import { DEFAULT_ROOT_ARTIFACT_COLLISION_DEBOUNCE, DEFAULT_ROOT_ARTIFACT_Z_INDEX } from '@/consts'
import { flowRunArtifactFactory, FlowRunArtifactFactory } from '@/factories/flowRunArtifact'
import { Artifact } from '@/models'
import { BoundsContainer } from '@/models/boundsContainer'
import { waitForApplication, waitForViewport } from '@/objects'
import { waitForConfig } from '@/objects/config'
import { emitter } from '@/objects/events'
import { layout } from '@/objects/settings'

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export async function flowRunArtifactsFactory() {
  const application = await waitForApplication()
  const viewport = await waitForViewport()
  const config = await waitForConfig()

  const artifacts: Map<string, FlowRunArtifactFactory> = new Map()
  const clusterNodes: FlowRunArtifactFactory[] = []

  let container: Container | null = null
  let internalData: Artifact[] | null = null
  let availableClusterNodes: FlowRunArtifactFactory[] = []
  let visibleItems: FlowRunArtifactFactory[] = []
  let nonTemporalAlignmentEngaged = false

  emitter.on('viewportMoved', () => update())

  async function render(newData?: Artifact[]): Promise<void> {
    if (newData) {
      internalData = newData
    }

    if (!internalData) {
      return
    }

    if (!container) {
      createContainer()
    }

    const promises: Promise<BoundsContainer>[] = []

    for (const artifact of internalData) {
      promises.push(createArtifact(artifact))
    }

    await Promise.all(promises)
  }

  async function createArtifact(artifact: Artifact): Promise<BoundsContainer> {
    if (artifacts.has(artifact.id)) {
      return artifacts.get(artifact.id)!.render()
    }

    const factory = await flowRunArtifactFactory(artifact)

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
    if (!container) {
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

  const checkLayout = debounce(async () => {
    visibleItems = [...artifacts.values()]
    visibleItems.sort((itemA, itemB) => itemA.element.x - itemB.element.x)

    availableClusterNodes = [...clusterNodes]

    await checkCollisions()

    for (const cluster of availableClusterNodes) {
      cluster.hideCluster()
    }
  }, DEFAULT_ROOT_ARTIFACT_COLLISION_DEBOUNCE)

  async function checkCollisions(startIndex?: number): Promise<void> {
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
      const firstIndex = Math.min(prevIndex, collisionIndex)
      const secondIndex = Math.max(prevIndex, collisionIndex)
      const prevItem = visibleItems[prevIndex]
      const collisionItem = visibleItems[collisionIndex]

      prevItem.element.visible = false
      collisionItem.element.visible = false

      const cluster = await clusterItems(prevItem, collisionItem)

      if (cluster) {
        visibleItems.splice(firstIndex, 1, cluster)
        visibleItems.splice(secondIndex, 1)
      }

      checkCollisions(firstIndex)
    }
  }

  async function clusterItems(
    prevItem: FlowRunArtifactFactory,
    currentItem: FlowRunArtifactFactory,
  ): Promise<FlowRunArtifactFactory | null> {
    const prevDate = prevItem.getDate()
    const prevIds = prevItem.getIds()
    const currentDate = currentItem.getDate()
    const currentIds = currentItem.getIds()

    if (!prevDate || !currentDate || !prevIds || !currentIds) {
      console.error('flowRunArtifacts: visible item is missing date or ID data')
      return null
    }

    let clusterNode: FlowRunArtifactFactory

    if (prevItem.isCluster) {
      clusterNode = prevItem
    } else if (currentItem.isCluster) {
      clusterNode = currentItem
    } else {
      clusterNode = await getClusterNode()
    }

    const ids = [...prevIds, ...currentIds]

    const dates = ids.map(id => artifacts.get(id)?.getDate())
    const minDate = new Date(Math.min(...dates.map(date => date?.getTime() ?? 0)))
    const maxDate = new Date(Math.max(...dates.map(date => date?.getTime() ?? 0)))
    const centeredDate = new Date((minDate.getTime() + maxDate.getTime()) / 2)

    clusterNode.render({ ids, date: centeredDate })

    return clusterNode
  }

  async function getClusterNode(): Promise<FlowRunArtifactFactory> {
    if (availableClusterNodes.length > 0) {
      return availableClusterNodes.pop()!
    }

    const newCluster = await flowRunArtifactFactory()
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