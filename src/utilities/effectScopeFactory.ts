import { effectScope } from 'vue'

type EffectScopeFactory = {
  run: (callback: () => void) => void,
  stop: () => void,
}

export function effectScopeFactory(): EffectScopeFactory {
  let scope = effectScope()

  function run(callback: () => void): void {
    if (!scope.active) {
      scope = effectScope()
    }

    scope.run(callback)
  }

  function stop(): void {
    scope.stop()
  }

  return {
    run,
    stop,
  }
}