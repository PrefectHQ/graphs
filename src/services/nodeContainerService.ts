import { Container } from 'pixi.js'
import { DEFAULT_NODE_CONTAINER_NAME } from '@/consts'
import { NodePreLayout } from '@/models/layout'
import { RunGraphNode } from '@/models/RunGraph'
import { NodeBoxService } from '@/services/nodeBoxService'
import { NodeLabelService } from '@/services/nodeLabelService'
import { NodePositionService } from '@/services/nodePositionService'
import { getLabelPositionRelativeToBox } from '@/utilities/getLabelPositionRelativeToBox'

type NodeParameters = {
  position: NodePositionService,
  parent: Container,
}

export class NodeContainerService {
  public readonly container = new Container()
  private readonly box: NodeBoxService
  private readonly label: NodeLabelService
  private readonly key: string | undefined
  private readonly position: NodePositionService

  public constructor(parameters: NodeParameters) {
    this.position = parameters.position

    this.box = new NodeBoxService({
      parent: this.container,
      position: this.position,
    })

    this.label = new NodeLabelService({
      parent: this.container,
    })

    this.initialize(parameters.parent)
  }

  public getLayout(node: RunGraphNode): NodePreLayout {
    const { parents, children, start_time } = node
    const x = this.position.getPixelsFromXPosition(start_time)
    const { width } = this.container

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
      return this.container
    }

    const box = await this.box.render(node)
    const label = await this.label.render(node)

    label.position = await getLabelPositionRelativeToBox(label, box)

    return this.container
  }

  private initialize(parent: Container): void {
    this.container.eventMode = 'none'
    this.container.name = DEFAULT_NODE_CONTAINER_NAME
    this.container.visible = false

    parent.addChild(this.container)
  }

  private getNodeCacheKey(node: RunGraphNode): string {
    const keys = Object.keys(node).sort((keyA, keyB) => keyA.localeCompare(keyB)) as (keyof RunGraphNode)[]
    const values = keys.map(key => node[key]?.toString())

    return values.join(',')
  }
}