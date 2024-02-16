import { Container } from 'pixi.js'
import { DEFAULT_ROOT_FLOW_STATE_Z_INDEX } from '@/consts'
import { FlowRunStateFactory, flowRunStateFactory } from '@/factories/flowRunState'
import { BoundsContainer } from '@/models/boundsContainer'
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

    const promises: Promise<BoundsContainer>[] = []

    for (let i = 0; i < internalData.length; i++) {
      promises.push(createState(internalData[i], i))
    }

    await Promise.all(promises)
  }

  async function createState(state: StateEvent, currIndex: number): Promise<BoundsContainer> {
    const nextState = internalData![currIndex + 1]
    const end = nextState.occurred

    if (states.has(state.id)) {
      return states.get(state.id)!.render({ end })
    }

    const stateFactory = await flowRunStateFactory(state, { end })

    states.set(state.id, stateFactory)

    element.addChild(stateFactory.element)

    return stateFactory.render()
  }

  return {
    element,
    render,
  }
}