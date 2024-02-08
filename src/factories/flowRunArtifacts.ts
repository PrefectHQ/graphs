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

  let container: Container | null = null
  let internalData: Artifact[] | null = null
  const artifacts: Map<string, FlowRunArtifactFactory> = new Map()

  let nonTemporalAlignmentEngaged = false

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
        // TODO: clear any clustering
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

  /**
   * Cluster checking logic
   */
  const clusterNodes: ArtifactClusterFactory[] = []
  let availableClusterNodes: ArtifactClusterFactory[] = []
  let visibleItems: (FlowRunArtifactFactory | ArtifactClusterFactory)[] = []

  const checkLayout = debounce(async () => {
    visibleItems = [...artifacts.values()]
    availableClusterNodes = [...clusterNodes]

    await checkCollisions()

    for (const cluster of availableClusterNodes) {
      cluster.render()
    }
  }, DEFAULT_ROOT_ARTIFACT_COLLISION_DEBOUNCE)

  async function checkCollisions(): Promise<void> {
    let lastEndX
    let prevItem: FlowRunArtifactFactory | ArtifactClusterFactory | undefined
    let collisionItem: FlowRunArtifactFactory | ArtifactClusterFactory | undefined

    visibleItems.sort((itemA, itemB) => itemA.element.x - itemB.element.x)

    for (const item of visibleItems) {
      item.element.visible = true

      const itemX = item.element.x

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
    let clusterNode: ArtifactClusterFactory | null = null
    let ids = []
    let middleDate: Date | undefined

    const isPrevItemAnArtifact = 'data' in prevItem
    const isCurrentItemAnArtifact = 'data' in currentItem

    if (isPrevItemAnArtifact && isCurrentItemAnArtifact) {
      // both items are artifacts
      ids = [prevItem.data.id, currentItem.data.id]
      middleDate = new Date((prevItem.data.created.getTime() + currentItem.data.created.getTime()) / 2)

      if (availableClusterNodes.length > 0) {
        clusterNode = availableClusterNodes.pop()!
        return
      }

      clusterNode = await artifactClusterFactory()
      container!.addChild(clusterNode.element)
      clusterNodes.push(clusterNode)
    } else if (!isPrevItemAnArtifact && !isCurrentItemAnArtifact) {
      // both items are clusters
      const prevItemData = prevItem.getCurrentData()
      const currentItemData = currentItem.getCurrentData()

      if (!prevItemData || !currentItemData) {
        console.error('flowRunArtifacts: visible cluster is missing data')
        return
      }

      ids = [...prevItemData.ids, ...currentItemData.ids]
      middleDate = new Date((prevItemData.date.getTime() + currentItemData.date.getTime()) / 2)
      clusterNode = prevItem
      availableClusterNodes.push(currentItem)
    } else {
      // one item is an artifact and the other is a cluster
      const artifact = (isPrevItemAnArtifact ? prevItem : currentItem) as FlowRunArtifactFactory
      const clusterNode = (isPrevItemAnArtifact ? currentItem : prevItem) as ArtifactClusterFactory

      const clusterData = clusterNode.getCurrentData()

      if (!clusterData) {
        console.error('flowRunArtifacts: visible cluster is missing data')
        return
      }

      ids = [...clusterData.ids, artifact.data.id]
      middleDate = new Date((clusterData.date.getTime() + artifact.data.created.getTime()) / 2)
    }

    if (!clusterNode) {
      console.error('flowRunArtifacts: no cluster node was found or created')
      return
    }

    clusterNode.render({ ids, date: middleDate })
    visibleItems.push(clusterNode)
    checkCollisions()
  }

  return {
    render,
  }
}