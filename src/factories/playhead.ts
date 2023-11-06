import { rectangleFactory } from '@/factories/rectangle'
import { waitForApplication, waitForViewport } from '@/objects'
import { waitForConfig } from '@/objects/config'
import { emitter } from '@/objects/events'
import { waitForScale } from '@/objects/scale'
import { waitForSettings } from '@/objects/settings'

const autoViewportUpdatePadding = 80

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export async function playheadFactory() {
  const application = await waitForApplication()
  const viewport = await waitForViewport()
  const settings = await waitForSettings()
  const config = await waitForConfig()
  const playhead = await rectangleFactory()

  let scale = await waitForScale()

  emitter.on('scaleUpdated', updated => scale = updated)

  function render(): void {
    if (!settings.isTemporal()) {
      playhead.visible = false
      return
    }
    console.log('tick')

    playhead.width = config.styles.playheadWidth
    playhead.height = application.stage.height
    playhead.tint = config.styles.playheadColor
    playhead.position.x = scale(new Date()) * viewport.scale.x + viewport.worldTransform.tx

    checkViewport()
  }

  function checkViewport(): void {
    if (viewport.moving) {
      return
    }

    const isVisible = playhead.position.x > 0 && playhead.position.x < application.screen.width

    if (!isVisible) {
      return
    }

    const shouldUpdateViewport = playhead.position.x > application.screen.width - autoViewportUpdatePadding

    if (!shouldUpdateViewport) {
      return
    }

    const originalLeft = viewport.left

    viewport.zoomPercent(-0.1, true)
    viewport.left = originalLeft
  }

  return {
    element: playhead,
    render,
  }
}