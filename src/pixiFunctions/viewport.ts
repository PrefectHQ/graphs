// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export async function getPixiViewport() {
  const { Viewport } = await import('pixi-viewport')

  return Viewport
}