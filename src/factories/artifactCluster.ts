import { Container } from 'pixi.js'

export type ArtifactClusterFactory = Awaited<ReturnType<typeof artifactClusterFactory>>

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export function artifactClusterFactory() {
  const element = new Container()

  function render(): void {
    // TODO: implement
  }
  return {
    element,
    render,
  }
}