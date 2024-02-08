import debounce from 'lodash.debounce'
import { Container } from 'pixi.js'
import { DEFAULT_ROOT_ARTIFACT_COLLISION_DEBOUNCE, DEFAULT_ROOT_ARTIFACT_Z_INDEX } from '@/consts'
import { ArtifactClusterFactory, artifactClusterFactory } from '@/factories/artifactCluster'
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
  const clusterNodes: ArtifactClusterFactory[] = []

  let container: Container | null = null
  let internalData: Artifact[] | null = null
  let availableClusterNodes: ArtifactClusterFactory[] = []
  let visibleItems: (FlowRunArtifactFactory | ArtifactClusterFactory)[] = []
  let nonTemporalAlignmentEngaged = false

  const checkLayout = debounce(async () => {
    visibleItems = [...artifacts.values()]
    availableClusterNodes = [...clusterNodes]

    await checkCollisions()

    for (const cluster of availableClusterNodes) {
      cluster.render()
    }
  }, DEFAULT_ROOT_ARTIFACT_COLLISION_DEBOUNCE)

  emitter.on('viewportDateRangeUpdated', () => {
    if (container && layout.isTemporal()) {
      checkLayout()
    }
  })

  async function render(newData?: Artifact[]): Promise<void> {
    if (newData) {
      internalData = newData
    }

    if (!internalData) {
      return
    }

    if (!container) {
      createContainer()
      initTicker()
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

  function initTicker(): void {
    application.ticker.add(ticker)
  }

  function ticker(): void {
    if (!container) {
      return
    }

    if (!layout.isTemporal()) {
      if (!nonTemporalAlignmentEngaged) {
        clearClustering()
        alignNonTemporal()
        nonTemporalAlignmentEngaged = true
      }

      container.position.x = viewport.scale._x + viewport.worldTransform.tx
      return
    }

    nonTemporalAlignmentEngaged = false
    container.position.x = 0
  }

  function alignNonTemporal(): void {
    const { artifactContentGap } = config.styles
    let x = 0

    for (const artifact of artifacts.values()) {

      artifact.element.x = x
      x += artifact.element.width + artifactContentGap
    }
  }

  async function checkCollisions(): Promise<void> {
    let lastEndX
    let prevItem: FlowRunArtifactFactory | ArtifactClusterFactory | undefined
    let collisionItem: FlowRunArtifactFactory | ArtifactClusterFactory | undefined

    visibleItems.sort((itemA, itemB) => itemA.element.x - itemB.element.x)

    for (const item of visibleItems) {
      const itemX = item.element.x
      item.element.visible = true

      if (prevItem && lastEndX && itemX < lastEndX) {
        collisionItem = item
        break
      }

      prevItem = item
      lastEndX = itemX + item.element.width
    }

    if (collisionItem && prevItem) {
      visibleItems = visibleItems.filter((item) => item !== prevItem && item !== collisionItem)

      collisionItem.element.visible = false
      prevItem.element.visible = false

      await handleCollision(prevItem, collisionItem)
    }
  }

  async function handleCollision(
    prevItem: FlowRunArtifactFactory | ArtifactClusterFactory,
    currentItem: FlowRunArtifactFactory | ArtifactClusterFactory,
  ): Promise<void> {
    const isPrevItemCluster = 'getCurrentData' in prevItem
    const isCurrentCluster = 'getCurrentData' in currentItem

    const prevDate = isPrevItemCluster ? prevItem.getCurrentData()?.date : prevItem.data.created
    const prevIds = isPrevItemCluster ? prevItem.getCurrentData()?.ids : [prevItem.data.id]
    const currentDate = isCurrentCluster ? currentItem.getCurrentData()?.date : currentItem.data.created
    const currentIds = isCurrentCluster ? currentItem.getCurrentData()?.ids : [currentItem.data.id]

    if (!prevDate || !currentDate || !prevIds || !currentIds) {
      console.error('flowRunArtifacts: visible item is missing date or ID data')
      return
    }

    let clusterNode: ArtifactClusterFactory

    if (isPrevItemCluster) {
      clusterNode = prevItem
    } else if (isCurrentCluster) {
      clusterNode = currentItem
    } else {
      clusterNode = await getClusterNode()
    }

    const ids = [...prevIds, ...currentIds]
    const date = new Date((prevDate.getTime() + currentDate.getTime()) / 2)

    clusterNode.render({ ids, date })
    visibleItems.push(clusterNode)
    checkCollisions()
  }

  async function getClusterNode(): Promise<ArtifactClusterFactory> {
    if (availableClusterNodes.length > 0) {
      return availableClusterNodes.pop()!
    }

    const newCluster = await artifactClusterFactory()
    container!.addChild(newCluster.element)
    clusterNodes.push(newCluster)

    return newCluster
  }

  function clearClustering(): void {
    for (const cluster of clusterNodes) {
      cluster.render()
    }
    for (const artifact of artifacts.values()) {
      artifact.element.visible = true
    }
  }

  return {
    render,
  }
}