import { Application, Graphics, Texture } from 'pixi.js'

type BoxTextures = Record<'cap' | 'body', Texture>

type GetNodeBoxTexturesProps = {
  appRef: Application,
  fill: number,
  borderRadius: number,
  boxCapWidth: number,
  height: number,
}

let nodeBoxTextureCache: Map<number, BoxTextures> | undefined

export function initNodeTextureCache(): void {
  nodeBoxTextureCache = new Map()
}

export function destroyNodeTextureCache(): void {
  if (nodeBoxTextureCache) {
    nodeBoxTextureCache.forEach(({ cap, body }) => {
      cap.destroy()
      body.destroy()
    })
    nodeBoxTextureCache.clear()
    nodeBoxTextureCache = undefined
  }
}

export function getNodeBoxTextures({
  appRef,
  fill,
  borderRadius,
  boxCapWidth,
  height,
}: GetNodeBoxTexturesProps): BoxTextures {
  if (!nodeBoxTextureCache) {
    initNodeTextureCache()
  }

  if (!nodeBoxTextureCache?.has(fill)) {
    const boxCap = new Graphics()
    boxCap.beginFill(fill)
    boxCap.moveTo(boxCapWidth, 0)
    boxCap.lineTo(boxCapWidth, height)
    boxCap.lineTo(0 + borderRadius, height)
    boxCap.bezierCurveTo(
      0, height,
      0, height - borderRadius,
      0, height - borderRadius,
    )
    boxCap.lineTo(0, borderRadius)
    boxCap.bezierCurveTo(
      0, 0,
      borderRadius, 0,
      borderRadius, 0,
    )
    boxCap.lineTo(boxCapWidth, 0)
    boxCap.endFill()

    const boxBody = new Graphics()
    boxBody.beginFill(fill)
    boxBody.drawRect(
      0,
      0,
      1,
      height,
    )
    boxBody.endFill()

    const cap = appRef.renderer.generateTexture(boxCap, {
      multisample: 2,
      resolution: 4,
    })
    const body = appRef.renderer.generateTexture(boxBody)

    nodeBoxTextureCache!.set(fill, {
      cap,
      body,
    })
  }

  return nodeBoxTextureCache!.get(fill)!
}
