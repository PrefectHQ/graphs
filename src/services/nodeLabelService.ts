import { BitmapText, Container } from 'pixi.js'
import { RunGraphNode } from '..'
import { waitForFonts } from '@/objects/fonts'

type LabelServiceParameters = {
  parent: Container,
}

export class NodeLabelService {
  private label: BitmapText | undefined
  private readonly parent: Container

  public constructor(parameters: LabelServiceParameters) {
    this.parent = parameters.parent
  }

  public async render(node: RunGraphNode): Promise<BitmapText> {
    const label = await this.getLabel(node)

    label.text = node.label

    return this.label!
  }

  private async getLabel(node: RunGraphNode): Promise<BitmapText> {
    if (this.label) {
      return this.label
    }

    const { inter } = await waitForFonts()

    this.label = inter(node.label, {
      fontSize: 12,
    })

    this.parent.addChild(this.label)

    return this.label
  }
}