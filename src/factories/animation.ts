import gsap from 'gsap'
import { waitForConfig } from '@/objects/config'
import { cull } from '@/objects/culling'

export async function animate(el: gsap.TweenTarget, vars: gsap.TweenVars, skipAnimation?: boolean): Promise<gsap.core.Tween> {
  const config = await waitForConfig()
  const duration = skipAnimation ? 0 : config.animationDuration / 1000

  return gsap.to(el, {
    ...vars,
    duration,
    ease: 'power1.out',
    onUpdate: () => {
      cull()
    },
  })
}