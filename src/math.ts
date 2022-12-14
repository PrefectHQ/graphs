/* eslint-disable id-length */
/* eslint-disable no-nested-ternary */
export const {
  abs,
  atan2,
  cos,
  max,
  min,
  sin,
  tan,
  sqrt,
  pow,
  floor,
  ceil,
  random,
} = Math

export const epsilon = 1e-12
export const pi = Math.PI
export const halfPi = pi / 2
export const tau = 2 * pi

export const acos = (x: number): number => {
  return x > 1 ? 0 : x < -1 ? pi : Math.acos(x)
}

export const asin = (x: number): number => {
  return x >= 1 ? halfPi : x <= -1 ? -halfPi : Math.asin(x)
}

export const pow2 = (n: number): number => {
  return n ** 2
}
