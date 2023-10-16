// Promise types are kinda crazy, simpler to just infer this type
// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export function promiseFactory() {
  let promiseResolve!: () => void
  let promiseReject!: () => void

  const promise = new Promise<void>((resolve, reject) => {
    promiseResolve = resolve
    promiseReject = reject
  })

  return {
    promise,
    resolve: promiseResolve,
    reject: promiseReject,
  }
}