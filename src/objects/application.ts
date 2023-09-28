import { Application } from 'pixi.js'

export let application: Application

export function createApplication(view: OffscreenCanvas): void {
  application = new Application({
    view,
    background: '#1099bb',
  })
}