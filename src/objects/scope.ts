import { EffectScope, effectScope } from 'vue'
import { emitter, waitForEvent } from '@/objects/events'

let scope: EffectScope | null = null

export function startScope(): void {
  scope = effectScope()
  emitter.emit('scopeCreated', scope)
}

export function stopScope(): void {
  scope?.stop()
  scope = null
}

export async function waitForScope(): Promise<EffectScope> {
  if (scope) {
    return scope
  }

  return await waitForEvent('scopeCreated')
}