import { Viewport } from 'pixi-viewport'

export type ViewportUpdatedCheck = () => boolean

export function viewportUpdatedFactory(viewport: Viewport): ViewportUpdatedCheck {
  let { left: previousLeft, right: previousRight } = viewport

  function updated(): boolean {
    const { left, right } = viewport

    if (left === previousLeft && right === previousRight) {
      return false
    }

    previousLeft = left
    previousRight = right

    return true
  }

  return updated
}