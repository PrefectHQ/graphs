import gsap from 'gsap'
import { waitForViewport } from '@/objects'
import { waitForConfig } from '@/objects/config'

export async function animate(el: gsap.TweenTarget, vars: gsap.TweenVars, skipAnimation?: boolean): Promise<gsap.core.Tween> {
  const config = await waitForConfig()
  const viewport = await waitForViewport()
  const duration = skipAnimation ? 0 : config.animationDuration / 1000

  return gsap.to(el, {
    ...vars,
    duration,
    ease: 'power1.out',
  }).then(() => {
    if (!skipAnimation) {
      // setting the viewport dirty here will allow culling to take place after any
      // number of animations that may have been called at once have completed, rather
      // than calling cull() n number of times all at once.
      viewport.dirty = true
    }
  })
}