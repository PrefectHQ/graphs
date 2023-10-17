import mitt from 'mitt'
import { Container } from 'pixi.js'
import { DEFAULT_NODES_CONTAINER_NAME, DEFAULT_POLL_INTERVAL } from '@/consts'
import { GraphPostLayout, GraphPreLayout, NodePreLayout } from '@/models/layout'
import { RunGraphNode, RunGraphNodes } from '@/models/RunGraph'
import { waitForConfig } from '@/objects/config'
import { layout } from '@/objects/layout'
import { ContainerService } from '@/services/containerService'
import { NodeContainerService } from '@/services/nodeContainerService'
import { NodePositionService } from '@/services/nodePositionService'
import { exhaustive } from '@/utilities/exhaustive'
import { WorkerMessage, layoutWorkerFactory } from '@/workers/runGraph'

type NodeParameters = {
  runId: string,
  parent: Container,
}

type NodesContainerEvents = {
  rendered: void,
}


export class NodesContainerService extends ContainerService {
  public readonly emitter = mitt<NodesContainerEvents>()
export class NodesContainerService extends ContainerService {
  private readonly runId: string
  private readonly worker = layoutWorkerFactory(this.onLayoutWorkerMessage.bind(this))
  private readonly positionService = new NodePositionService()
  private readonly nodes = new Map<string, NodeContainerService>()

  public constructor(parameters: NodeParameters) {
    super(parameters)

    this.runId = parameters.runId

    this.container.name = DEFAULT_NODES_CONTAINER_NAME

    this.fetch()
  }

  private async fetch(): Promise<void> {
    const config = await waitForConfig()
    const data = await config.fetch(this.runId)

    this.positionService.setHorizontalMode({
      mode: layout.horizontal,
      startTime: data.start_time,
    })

    this.positionService.setVerticalMode({
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
    const service = this.getNodeContainerService(node)

    await service.render(node)

    return service.getLayout(node)
  }

  private getNodeContainerService(node: RunGraphNode): NodeContainerService {
    const service = this.nodes.get(node.id) ?? new NodeContainerService({
      kind: node.kind,
      parent: this.container,
      positionService: this.positionService,
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
      const y = this.positionService.getPixelsFromYPosition(layout.y)
      objects.node.position = { x, y }
      objects.node.visible = true
    })

    this.emitter.emit('rendered')
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