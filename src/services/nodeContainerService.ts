import { BitmapText, Container, Graphics } from 'pixi.js'
import { DEFAULT_NODE_CONTAINER_NAME } from '@/consts'
import { NodePreLayout } from '@/models/layout'
import { RunGraphNode } from '@/models/RunGraph'
import { waitForConfig } from '@/objects/config'
import { waitForFonts } from '@/objects/fonts'
import { NodePositionService } from '@/services/nodePositionService'
import { getLabelPositionRelativeToBox } from '@/utilities/getLabelPositionRelativeToBox'
import { promiseFactory } from '@/utilities/promiseFactory'

type NodeParameters = {
  node: RunGraphNode,
  position: NodePositionService,
  parent: Container,
}

export class NodeContainerService {
  public readonly container = new Container()
  private label: BitmapText | null = null
  private readonly box = new Graphics()
  private readonly key: string
  private readonly node: RunGraphNode
  private readonly position: NodePositionService
  private readonly rendered = promiseFactory()

  public constructor(parameters: NodeParameters) {
    this.node = parameters.node
    this.position = parameters.position
    this.key = this.getNodeCacheKey(parameters.node)
    this.initialize(parameters.parent)
    this.render()

    // todo: just a dummy offset to prove offsets are working
    this.position.setNodeOffset({ axis: 10, nodeId: 'foo', offset: 100 })

    this.container.addChild(this.box)
  }

  public async setNode(node: RunGraphNode): Promise<void> {
    const key = this.getNodeCacheKey(node)

    if (key === this.key) {
      return
    }

    await this.render()
  }

  public async getLayout(): Promise<NodePreLayout> {
    await this.rendered.promise

    const { parents, children, start_time } = this.node
    const x = this.position.getPixelsFromXPosition(start_time)
    const { width } = this.container

    return {
      x,
      width,
      parents,
      children,
    }
  }

  private async render(): Promise<void> {
    const box = await this.renderBox()
    await this.renderLabel(box)

    this.rendered.resolve()
  }

  private async renderBox(): Promise<Graphics> {
    const config = await waitForConfig()
    const { background } = config.styles.node(this.node)

    const { start_time, end_time } = this.node
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

  private async renderLabel(box: Graphics): Promise<void> {
    if (this.label) {
      this.label.text = this.node.label
      this.label.position = await getLabelPositionRelativeToBox(this.label, box)
      return
    }

    const { inter } = await waitForFonts()

    const label = inter(this.node.label, {
      fontSize: 12,
    })

    this.label = label
    this.label.position = await getLabelPositionRelativeToBox(label, box)
    this.container.addChild(label)
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