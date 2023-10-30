import { RunGraphData } from '@/models'

declare namespace GlobalMixins {
  interface DisplayObjectEvents {
    resized: [{ height: number, width: number }],
    rendered: [],
    fetched: [RunGraphData],
  }
}