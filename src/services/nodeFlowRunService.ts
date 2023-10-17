import { BitmapText, Container, Graphics } from 'pixi.js'
import { DEFAULT_NODE_CONTAINER_NAME } from '@/consts'
import { Pixels } from '@/models/layout'
import { RunGraphNode } from '@/models/RunGraph'
import { waitForConfig } from '@/objects/config'
import { ContainerService } from '@/services/containerService'
import { NodeBoxService } from '@/services/nodeBoxService'
import { NodeRenderService } from '@/services/nodeContainerService'
import { NodeLabelService } from '@/services/nodeLabelService'
import { NodePositionService } from '@/services/nodePositionService'

type NodeTaskRunServiceParameters = {
  positionService: NodePositionService,
  parent: Container,
}

export class NodeFlowRunService extends ContainerService implements NodeRenderService {
  private readonly positionService: NodePositionService
  private readonly box: NodeBoxService
  private readonly label: NodeLabelService

  public constructor(parameters: NodeTaskRunServiceParameters) {
    super()

    this.positionService = parameters.positionService
    this.container.name = DEFAULT_NODE_CONTAINER_NAME
    this.container.visible = false

    this.box = new NodeBoxService({
      parent: this.container,
      positionService: this.positionService,
    })

    this.label = new NodeLabelService({
      parent: this.container,
    })

    parameters.parent.addChild(this.container)
  }

  public async render(node: RunGraphNode): Promise<Container> {
    const box = await this.box.render(node)
    const label = await this.label.render({ ...node, label: `${node.label} - FLOW RUN` })

    label.position = await this.getLabelPositionRelativeToBox(label, box)

    return this.container
  }

  public async getLabelPositionRelativeToBox(label: BitmapText, box: Graphics): Promise<Pixels> {
    const config = await waitForConfig()

    // todo: this should probably be nodePadding
    const margin = config.styles.nodeMargin
    const inside = box.width > margin + label.width + margin
    const y = box.height / 2 - label.height

    if (inside) {
      return {
        x: margin,
        y,
      }
    }

    return {
      x: box.width + margin,
      y,
    }
  }
}