import { Container, Ticker } from 'pixi.js'
import { NodePreLayout } from '@/models/layout'
import { RunGraphNode, RunGraphNodeKind } from '@/models/RunGraph'
import { ContainerService } from '@/services/containerService'
import { NodeFlowRunService } from '@/services/nodeFlowRunService'
import { NodePositionService } from '@/services/nodePositionService'
import { NodeTaskRunService } from '@/services/nodeTaskRunService'

type NodeParameters = {
  positionService: NodePositionService,
  kind: RunGraphNodeKind,
  parent: Container,
}

export type NodeRenderService = ContainerService & {
  render: (node: RunGraphNode) => Promise<Container>,
}

export class NodeContainerService {
  public readonly node: NodeRenderService
  private readonly key: string | undefined
  private readonly positionService: NodePositionService

  public constructor(parameters: NodeParameters) {
    this.positionService = parameters.positionService

    this.node = this.getNodeService(parameters)
  }

  public getLayout(node: RunGraphNode): NodePreLayout {
    const { parents, children, start_time } = node
    const x = this.positionService.getPixelsFromXPosition(start_time)
    const { width } = this.node.container

    return {
      x,
      width,
      parents,
      children,
    }
  }

  public async render(node: RunGraphNode): Promise<Container> {
    const key = this.getNodeCacheKey(node)

    if (key === this.key) {
      return this.node.container
    }

    const container = await this.node.render(node)

    if (!node.end_time) {
      Ticker.shared.addOnce(() => this.render(node))
    }

    return container
  }

  private getNodeService(parameters: NodeParameters): NodeRenderService {
    const { kind } = parameters

    switch (kind) {
      case 'task-run':
        return new NodeTaskRunService(parameters)
      case 'flow-run':
        return new NodeFlowRunService(parameters)
      default:
        const exhaustive: never = kind
        throw new Error(`switch does not have case for value: ${exhaustive}`)
    }
  }

  private getNodeCacheKey(node: RunGraphNode): string {
    const keys = Object.keys(node).sort((keyA, keyB) => keyA.localeCompare(keyB)) as (keyof RunGraphNode)[]
    const values = keys.map(key => {
      const value = node[key] ?? new Date()

      return value.toString()
    })

    return values.join(',')
  }
}