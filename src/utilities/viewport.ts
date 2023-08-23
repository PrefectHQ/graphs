import { Viewport } from 'pixi-viewport'

export type ViewportUpdatedCheck = () => boolean

export function viewportUpdatedFactory(viewport: Viewport): ViewportUpdatedCheck {
  let { left: previousLeft, right: previousRight, height: previousHeight } = viewport

  function updated(): boolean {
    const { left, right, height } = viewport

    if (left === previousLeft && right === previousRight && height === previousHeight) {
      return false
    }

    previousLeft = left
    previousRight = right
    previousHeight = height

    return true
  }

  return updated
}