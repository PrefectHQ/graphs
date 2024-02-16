import { Container } from 'pixi.js'
import { DEFAULT_ROOT_FLOW_STATE_Z_INDEX } from '@/consts'
import { FlowRunStateFactory, flowRunStateFactory } from '@/factories/flowRunState'
import { StateEvent } from '@/models/states'

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export function flowRunStatesFactory() {
  const element = new Container()

  const states = new Map<string, FlowRunStateFactory>()
  let internalData: StateEvent[] | null = null

  element.zIndex = DEFAULT_ROOT_FLOW_STATE_Z_INDEX

  async function render(newStateData?: StateEvent[]): Promise<void> {
    if (newStateData) {
      internalData = newStateData
    }

    if (!internalData) {
      return
    }

    const promises: Promise<void>[] = []

    for (let i = 0; i < internalData.length; i++) {
      promises.push(createState(internalData[i], i))
    }

    await Promise.all(promises)
  }

  async function createState(state: StateEvent, currIndex: number): Promise<void> {
    const nextState = internalData && internalData.length >= currIndex + 1 && internalData[currIndex + 1]
    const options = nextState ? { end: nextState.occurred } : undefined

    if (states.has(state.id)) {
      return states.get(state.id)!.render(options)
    }

    const stateFactory = await flowRunStateFactory(state, options)

    states.set(state.id, stateFactory)

    element.addChild(stateFactory.element)

    return stateFactory.render()
  }

  return {
    element,
    render,
  }
}