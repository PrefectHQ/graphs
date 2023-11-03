import { Container } from 'pixi.js'
import { rectangleFactory } from '@/factories/rectangle'
import { waitForApplication, waitForViewport } from '@/objects'
import { waitForConfig } from '@/objects/config'
import { emitter } from '@/objects/events'
import { waitForScale } from '@/objects/scale'

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export async function playheadFactory() {
  const application = await waitForApplication()
  const viewport = await waitForViewport()
  const config = await waitForConfig()
  let scale = await waitForScale()

  const element = new Container()

  const playhead = await rectangleFactory()
  element.addChild(playhead)

  emitter.on('scaleUpdated', updated => scale = updated)

  application.ticker.add(() => {
    render()
  })

  function render(): void {
    playhead.width = config.styles.playheadWidth
    playhead.height = application.stage.height
    playhead.tint = config.styles.playheadColor
    playhead.position.x = scale(new Date()) * viewport.scale._x + viewport.worldTransform.tx
  }

  return {
    element,
    render,
  }
}