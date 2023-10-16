import { Container, Graphics } from 'pixi.js'
import { RunGraphNode } from '@/models/RunGraph'
import { waitForConfig } from '@/objects/config'
import { NodePositionService } from '@/services/nodePositionService'

type NodeBoxServiceParameters = {
  parent: Container,
  position: NodePositionService,
}

export class NodeBoxService {
  private readonly box = new Graphics()
  private readonly position: NodePositionService

  public constructor(parameters: NodeBoxServiceParameters) {
    this.position = parameters.position

    parameters.parent.addChild(this.box)
  }

  public async render(node: RunGraphNode): Promise<Graphics> {
    const config = await waitForConfig()
    const { background } = config.styles.node(node)

    const { start_time, end_time } = node
    const boxLeft = this.position.getPixelsFromXPosition(start_time)
    const boxRight = this.position.getPixelsFromXPosition(end_time ?? new Date())
    const boxWidth = boxRight - boxLeft
    const boxHeight = config.styles.nodeHeight - config.styles.nodeMargin * 2

    this.box.clear()
    this.box.lineStyle(1, 0x0, 1, 2)
    this.box.beginFill(background)
    this.box.drawRoundedRect(0, 0, boxWidth, boxHeight, 4)
    this.box.endFill()

    return this.box
  }
}