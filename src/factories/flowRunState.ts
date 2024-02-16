import { Container } from 'pixi.js'

export type FlowRunStateFactory = Awaited<ReturnType<typeof flowRunStateFactory>>

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export function flowRunStateFactory() {
  const element = new Container()

  function render(): Container {
    // render the state
    return element
  }

  return {
    element,
    render,
  }
}