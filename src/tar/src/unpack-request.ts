let ID = 1
export class UnpackRequest {
  id: number = ID++
  tarData: Buffer
  target: string
  resolve!: () => void
  reject!: (reason?: any) => void
  promise: Promise<void> = new Promise((res, rej) => {
    this.resolve = res
    this.reject = rej
  })
  constructor(tarData: Buffer, target: string) {
    this.tarData = tarData
    this.target = target
  }
}
