import { Container } from 'pixi.js'
import { rectangleFactory } from '@/factories/rectangle'
import { waitForApplication, waitForViewport } from '@/objects'
import { waitForConfig } from '@/objects/config'
import { emitter } from '@/objects/events'
import { waitForScale } from '@/objects/scale'

const autoViewportUpdatePadding = 80

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export async function playheadFactory() {
  const application = await waitForApplication()
  const viewport = await waitForViewport()
  const config = await waitForConfig()
  let scale = await waitForScale()
  let initialized = false

  const element = new Container()

  const playhead = await rectangleFactory()
  element.addChild(playhead)

  emitter.on('scaleUpdated', updated => scale = updated)

  const ticker = (): void => {
    render()
    checkViewport()
  }

  function render(): void {
    playhead.width = config.styles.playheadWidth
    playhead.height = application.stage.height
    playhead.tint = config.styles.playheadColor
    element.position.x = scale(new Date()) * viewport.scale._x + viewport.worldTransform.tx

    if (!initialized) {
      application.ticker.add(ticker)
      initialized = true
    }
  }

  function checkViewport(): void {
    const playheadStartedVisible = element.position.x > 0 && element.position.x < application.screen.width

    if (
      !viewport.moving
      && playheadStartedVisible
      && element.position.x > application.screen.width - autoViewportUpdatePadding
    ) {
      const originalLeft = scale.invert(viewport.left)

      viewport.zoomPercent(-0.1, true)
      viewport.left = scale(originalLeft)
    }
  }

  function stopTicker(): void {
    application.ticker.remove(ticker)
  }

  return {
    element,
    render,
    stopTicker,
  }
}