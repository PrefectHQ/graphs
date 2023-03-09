import { Application, Graphics, Texture } from 'pixi.js'

type BoxTextures = Record<'cap' | 'body', Texture>
type BorderRectTextures = Record<'corner' | 'edge', Texture>
type RoundedBorderRectCacheKey = {
  borderRadius: number,
  borderColor: number,
  borderWidth: number,
}

let nodeBoxTextureCache: Map<number, BoxTextures> | undefined
let arrowTextureCache: Map<number, Texture> | undefined
let roundedBorderRectCache: Map<RoundedBorderRectCacheKey, BorderRectTextures> | undefined

const textureSampleSettings = {
  multisample: 2,
  resolution: 4,
}

export function initNodeTextureCache(): void {
  nodeBoxTextureCache = new Map()
  arrowTextureCache = new Map()
  roundedBorderRectCache = new Map()
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
  if (arrowTextureCache) {
    arrowTextureCache.forEach((texture) => {
      texture.destroy()
    })
    arrowTextureCache.clear()
    arrowTextureCache = undefined
  }
  if (roundedBorderRectCache) {
    roundedBorderRectCache.forEach(({ corner, edge }) => {
      corner.destroy()
      edge.destroy()
    })
    roundedBorderRectCache.clear()
    roundedBorderRectCache = undefined
  }
}

type GetNodeBoxTexturesProps = {
  pixiApp: Application,
  fill: number,
  borderRadius: number,
  boxCapWidth: number,
  height: number,
}
export function getNodeBoxTextures({
  pixiApp,
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

    const cap = pixiApp.renderer.generateTexture(boxCap, textureSampleSettings)
    const body = pixiApp.renderer.generateTexture(boxBody)

    nodeBoxTextureCache!.set(fill, {
      cap,
      body,
    })
  }

  return nodeBoxTextureCache!.get(fill)!
}

type GetArrowTextureProps = {
  pixiApp: Application,
  strokeColor: number,
  edgeWidth: number,
  edgeLength: number,
}
export function getArrowTexture({
  pixiApp,
  strokeColor,
  edgeWidth,
  edgeLength,
}: GetArrowTextureProps): Texture {
  if (!arrowTextureCache) {
    initNodeTextureCache()
  }

  if (!arrowTextureCache?.has(strokeColor)) {
    const arrow = new Graphics()
    arrow.lineStyle(edgeWidth, strokeColor, 1, 0.5)
    arrow.moveTo(-edgeLength, -edgeLength)
    arrow.lineTo(0, 0)
    arrow.lineTo(-edgeLength, edgeLength)

    const arrowTexture = pixiApp.renderer.generateTexture(arrow, textureSampleSettings)

    arrowTextureCache!.set(strokeColor, arrowTexture)
  }

  return arrowTextureCache!.get(strokeColor)!
}

type GetRoundedBorderRectTexturesProps = {
  pixiApp: Application,
  borderRadius: number,
  borderColor: number,
  borderWidth: number,
}
export function getRoundedBorderRectTextures({
  pixiApp,
  borderRadius,
  borderColor,
  borderWidth,
}: GetRoundedBorderRectTexturesProps): BorderRectTextures {
  if (!roundedBorderRectCache) {
    initNodeTextureCache()
  }

  const cacheKey = { borderRadius, borderColor, borderWidth }

  if (!roundedBorderRectCache?.has(cacheKey)) {
    const corner = new Graphics()
    corner.lineStyle(borderWidth, borderColor)
    corner.moveTo(0, borderRadius)
    corner.bezierCurveTo(
      0, borderRadius,
      0, 0,
      borderRadius, 0,
    )

    const edge = new Graphics()
    edge.beginFill(borderColor)
    edge.drawRect(
      0,
      0,
      borderWidth,
      borderWidth,
    )
    edge.endFill()

    const cornerTexture = pixiApp.renderer.generateTexture(corner, textureSampleSettings)
    const edgeTexture = pixiApp.renderer.generateTexture(edge, textureSampleSettings)

    roundedBorderRectCache!.set(cacheKey, {
      corner: cornerTexture,
      edge: edgeTexture,
    })
  }

  return roundedBorderRectCache!.get(cacheKey)!
}
