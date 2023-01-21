export function mapSome<K, V>(map: Map<K, V>, callback: (value: V, key: K) => boolean): boolean {
  for (const [key, value] of map.entries()) {
    if (callback(value, key)) {
      return true
    }
  }

  return false
}
