import { Container } from 'pixi.js'
import { playheadFactory } from '@/factories/playhead'
import { waitForApplication } from '@/objects/application'
import { emitter } from '@/objects/events'
import { waitForRunData } from '@/objects/nodes'

let playheadContainer: Container | null = null

export async function startPlayhead(): Promise<void> {
  const application = await waitForApplication()
  const runGraphData = await waitForRunData()
  const { element, render, stopTicker } = await playheadFactory()

  const renderIfNotStopped = (): void => {
    if (playheadContainer) {
      render()
    }
  }

  playheadContainer = element

  if (!runGraphData.end_time) {
    application.stage.addChild(element)
    render()
  }

  emitter.on('runDataUpdated', (data) => {
    if (data.end_time && playheadContainer) {
      application.stage.removeChild(playheadContainer)
      stopTicker()
      playheadContainer = null
    }
  })

  emitter.on('viewportDateRangeUpdated', () => renderIfNotStopped())
  emitter.on('layoutSettingsUpdated', () => renderIfNotStopped())
  emitter.on('configUpdated', () => renderIfNotStopped())
}

export function stopPlayhead(): void {
  playheadContainer = null
}