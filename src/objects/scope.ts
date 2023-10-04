import { EffectScope, effectScope } from 'vue'
import { waitForEvent } from '@/objects/events'

let scope: EffectScope | null = null

export function startScope(): void {
  scope = effectScope()
}

export function stopScope(): void {
  scope?.stop()
  scope = null
}

export async function waitForScope(): Promise<EffectScope> {
  if (scope) {
    return await scope
  }

  return waitForEvent('scopeCreated')
}