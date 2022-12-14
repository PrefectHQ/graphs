import { floor, random } from "@/math"

/**
 * Generates a psuedo-random hex color
 * @returns string - a hex color in the format #000000
 */
export const randomColor = (): string => {
  return `#${floor(random() * 16777215).toString(16)}`
}