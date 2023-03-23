import gsap from 'gsap'
import { Container, Sprite, Graphics } from 'pixi.js'
import { WatchStopHandle, watch } from 'vue'
import { GraphState } from '@/models'

const yPadding = 16
const dotSize = 8
const dotsGap = 4
const dotAnimationDuration = 0.7
const dotAnimationOffset = 0.25

type LoadingIndicatorProps = {
  graphState: GraphState,
}

export class LoadingIndicator extends Container {
  private readonly graphState

  private readonly dimensionsObject = new Sprite()
  private dots: Graphics[] = []

  private readonly unWatchers: WatchStopHandle[] = []

  public constructor({
    graphState,
  }: LoadingIndicatorProps) {
    super()

    this.graphState = graphState

    this.initDimensions()
    this.initDots()

    this.initWatchers()
  }

  private initWatchers(): void {
    const { styleOptions } = this.graphState
    const styleWatcher = watch(styleOptions, () => {
      this.destroyDots()
      this.initDots()
    })

    this.unWatchers.push(styleWatcher)
  }

  private initDimensions(): void {
    const width = dotSize * 3 + dotsGap * 2
    const height = yPadding * 2 + dotSize

    this.dimensionsObject.width = width
    this.dimensionsObject.height = height

    this.addChild(this.dimensionsObject)
  }

  private initDots(): void {
    const { colorTextDefault } = this.graphState.styleOptions.value

    const dot = new Graphics()

    dot.beginFill(colorTextDefault)
    dot.drawCircle(0, 0, dotSize / 2)
    dot.endFill()
    dot.alpha = 0
    dot.position.y = yPadding

    const dot2 = dot.clone()
    dot2.alpha = 0
    dot2.position.set(dotSize + dotsGap, yPadding)

    const dot3 = dot.clone()
    dot3.alpha = 0
    dot3.position.set((dotSize + dotsGap) * 2, yPadding)

    this.dots.push(dot, dot2, dot3)
    this.addChild(dot, dot2, dot3)

    this.initAnimation()
  }

  private initAnimation(): void {
    const animateAlpha = (el: Graphics, delay: number = 0): void => {
      gsap.to(el, {
        alpha: 1,
        duration: dotAnimationDuration,
        delay: delay,
        onComplete: () => {
          gsap.to(el, {
            alpha: 0,
            duration: dotAnimationDuration,
            onComplete: () => animateAlpha(el),
          })
        },
      })
    }

    this.dots.forEach((dot, index) => {
      animateAlpha(dot, index * dotAnimationOffset)
    })
  }

  private destroyDots(): void {
    this.dots.forEach((dot) => {
      gsap.killTweensOf(dot)
      dot.destroy()
    })

    this.dots = []
  }

  public destroy(): void {
    this.unWatchers.forEach((unWatcher) => unWatcher())

    this.removeChildren()
    this.dimensionsObject.destroy()
    this.destroyDots()

    super.destroy.call(this)
  }
}
