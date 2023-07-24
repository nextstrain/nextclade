import { unpack, pack } from 'msgpackr'

export function messagepackDeserialize<T>(message: Buffer | Uint8Array): T {
  return unpack(message) as T
}

export function messagepackSerialize<T>(value: T): Uint8Array {
  return pack(value)
}
