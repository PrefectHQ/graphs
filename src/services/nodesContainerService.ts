import { Container } from 'pixi.js'
import { DEFAULT_NODES_CONTAINER_NAME, DEFAULT_POLL_INTERVAL } from '@/consts'
import { GraphPostLayout, GraphPreLayout, NodePreLayout } from '@/models/layout'
import { RunGraphNode, RunGraphNodes } from '@/models/RunGraph'
import { waitForConfig } from '@/objects/config'
import { layout } from '@/objects/layout'
import { centerViewport } from '@/objects/viewport'
import { NodeContainerService } from '@/services/nodeContainerService'
import { NodePositionService } from '@/services/nodePositionService'
import { exhaustive } from '@/utilities/exhaustive'
import { WorkerMessage, layoutWorkerFactory } from '@/workers/runGraph'

type NodeParameters = {
  runId: string,
  parent: Container,
}

export class NodesContainerService {
  public container = new Container()

  private readonly runId: string
  private readonly worker = layoutWorkerFactory(this.onLayoutWorkerMessage.bind(this))
  private readonly position = new NodePositionService()
  private readonly nodes = new Map<string, NodeContainerService>()

  public constructor(parameters: NodeParameters) {
    this.runId = parameters.runId

    this.initialize(parameters.parent)

    this.fetch()
  }

  private initialize(parent: Container): void {
    this.container.name = DEFAULT_NODES_CONTAINER_NAME
    parent.addChild(this.container)
  }

  private async fetch(): Promise<void> {
    const config = await waitForConfig()
    const data = await config.fetch(this.runId)

    this.position.setHorizontalMode({
      mode: layout.horizontal,
      startTime: data.start_time,
    })

    this.position.setVerticalMode({
      mode: layout.vertical,
      rowHeight: config.styles.nodeHeight,
    })

    await this.render(data.nodes)

    if (!data.end_time) {
      setTimeout(() => this.fetch(), DEFAULT_POLL_INTERVAL)
    }
  }

  private async render(nodes: RunGraphNodes): Promise<void> {
    const layout: GraphPreLayout = new Map()
    const promises: Promise<NodePreLayout>[] = []

    nodes.forEach(async node => {
      const promise = this.renderNode(node)

      promises.push(promise)

      layout.set(node.id, await promise)
    })

    await Promise.all(promises)

    this.worker.postMessage({ type: 'layout', layout })
  }

  private async renderNode(node: RunGraphNode): Promise<NodePreLayout> {
    const nodeContainerService = this.getNodeContainerService(node)

    await nodeContainerService.render(node)

    return nodeContainerService.getLayout(node)
  }

  private getNodeContainerService(node: RunGraphNode): NodeContainerService {
    const service = this.nodes.get(node.id) ?? new NodeContainerService({
      parent: this.container,
      position: this.position,
    })

    this.nodes.set(node.id, service)

    return service
  }

  private layout(layout: GraphPostLayout): void {
    layout.forEach((layout, nodeId) => {
      const objects = this.nodes.get(nodeId)

      if (!objects) {
        console.warn(`Count not find ${nodeId} from layout in graph`)
        return
      }

      const { x } = layout
      const y = this.position.getPixelsFromYPosition(layout.y)
      objects.container.position = { x, y }
      objects.container.visible = true
    })

    // this should only happen on the first layout
    centerViewport()
  }


  private onLayoutWorkerMessage({ data }: MessageEvent<WorkerMessage>): void {
    const { type } = data

    switch (type) {
      case 'layout':
        this.layout(data.layout)
        return
      default:
        exhaustive(type)
    }
  }
}