import { emitter } from '@/objects/events'

export let stage: HTMLDivElement | null = null

const observer = new ResizeObserver(() => {
  if (stage) {
    emitter.emit('stageUpdated', stage)
  }
})

export function startStage(value: HTMLDivElement): void {
  stage = value

  observer.observe(stage)

  emitter.emit('stageCreated', stage)
}

export function stopStage(): void {
  if (stage) {
    observer.unobserve(stage)
  }
}
