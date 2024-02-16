import { Container } from 'pixi.js'
import { FlowRunStateFactory, flowRunStateFactory } from '@/factories/flowRunState'
import { BoundsContainer } from '@/models/boundsContainer'
import { StateEvent } from '@/models/states'

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export function flowRunStatesFactory() {
  const element = new Container()

  const states = new Map<string, FlowRunStateFactory>()
  let internalData: StateEvent[] | null = null

  async function render(newStateData?: StateEvent[]): Promise<void> {
    if (newStateData) {
      internalData = newStateData
    }

    if (!internalData) {
      return
    }

    const promises: Promise<BoundsContainer>[] = []

    for (const state of internalData) {
      promises.push(createState(state))
    }

    await Promise.all(promises)
  }

  async function createState(state: StateEvent): Promise<BoundsContainer> {
    if (states.has(state.id)) {
      return states.get(state.id)!.render()
    }

    const stateFactory = await flowRunStateFactory()

    states.set(state.id, stateFactory)

    element.addChild(stateFactory.element)

    return stateFactory.render()
  }

  return {
    element,
    render,
  }
}