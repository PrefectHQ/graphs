// Not fixing linting errors from pixi source code
/* eslint-disable @typescript-eslint/no-unnecessary-condition */

import { Container, Bounds, Rectangle } from 'pixi.js'

/**
 * This container extends the container from pixi but overrides
 * the updateTransform and calculateBounds methods.
 * The versions of these methods here are functional copies
 * except these version also check children whose renderable
 * or visible property is set to false. This means a BoundsContainer
 * will have the same bounds even if some or all of its children are not
 * rendered. This is important for any container where we need to know the actual
 * size of the container even if its children have been culled.
 */
export class BoundsContainer extends Container {
  private _customBounds = new Bounds()

  public calculateBounds(): void {
    this._customBounds.clear()

    for (const child of this.children) {
      /**
       * We always want all children of this type of container to be included
       * in the bounds of this container, regardless of visibility
       */
      const childBounds = child.getBounds()

      // Convert Rectangle to Bounds
      const bounds = new Bounds()
      bounds.minX = childBounds.x
      bounds.minY = childBounds.y
      bounds.maxX = childBounds.x + childBounds.width
      bounds.maxY = childBounds.y + childBounds.height

      this._customBounds.addBounds(bounds)
    }
  }

  public getBounds(skipUpdate?: boolean, rect?: Rectangle): Rectangle {
    this.calculateBounds()

    const result = rect || new Rectangle()
    result.x = this._customBounds.minX
    result.y = this._customBounds.minY
    result.width = this._customBounds.maxX - this._customBounds.minX
    result.height = this._customBounds.maxY - this._customBounds.minY

    return result
  }

  public get width(): number {
    this.calculateBounds()
    return this._customBounds.maxX - this._customBounds.minX
  }

  public get height(): number {
    this.calculateBounds()
    return this._customBounds.maxY - this._customBounds.minY
  }
}