export function repeat<T>(length: number, method: (index: number) => T): T[] {
  return Array.from({ length }, (element, index) => method(index))
}