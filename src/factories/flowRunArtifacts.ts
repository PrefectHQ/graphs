import { Container } from 'pixi.js'
import { DEFAULT_ROOT_ARTIFACT_Z_INDEX } from '@/consts'
import { flowRunArtifactFactory, FlowRunArtifactFactory } from '@/factories/flowRunArtifact'
import { Artifact } from '@/models'
import { BoundsContainer } from '@/models/boundsContainer'
import { waitForApplication, waitForViewport } from '@/objects'
import { waitForConfig } from '@/objects/config'
import { layout } from '@/objects/settings'

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export async function flowRunArtifactsFactory() {
  const application = await waitForApplication()
  const viewport = await waitForViewport()
  const config = await waitForConfig()

  let container: Container | null = null
  let internalData: Artifact[] | null = null
  const artifacts: Map<string, FlowRunArtifactFactory> = new Map()

  async function render(newData?: Artifact[]): Promise<void> {
    if (newData) {
      internalData = newData
    }

    if (!internalData) {
      return
    }

    if (!container) {
      createContainer()
      initTicker()
    }

    const promises: Promise<BoundsContainer>[] = []

    for (const artifact of internalData) {
      promises.push(createArtifact(artifact))
    }

    await Promise.all(promises)
  }

  async function createArtifact(artifact: Artifact): Promise<BoundsContainer> {
    if (artifacts.has(artifact.id)) {
      return artifacts.get(artifact.id)!.render()
    }

    const factory = await flowRunArtifactFactory(artifact)

    artifacts.set(artifact.id, factory)

    container!.addChild(factory.element)

    return factory.render()
  }

  function createContainer(): void {
    container = new Container()
    container.zIndex = DEFAULT_ROOT_ARTIFACT_Z_INDEX
    application.stage.addChild(container)
  }

  function initTicker(): void {
    application.ticker.add(ticker)
  }

  function ticker(): void {
    if (!layout.isTemporal()) {
      const { artifactContentGap } = config.styles
      let x = viewport.scale._x + viewport.worldTransform.tx

      for (const artifact of artifacts.values()) {
        artifact.element.x = x
        x += artifact.element.width + artifactContentGap
      }
    }

    // TODO: Check collisions
  }

  return {
    render,
  }
}