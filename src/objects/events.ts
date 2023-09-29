import mitt from 'mitt'

type Events = {
  scaleXUpdated: void,
  scaleYUpdated: void,
}

export const emitter = mitt<Events>()