import { encode, decode } from '@msgpack/msgpack'

export function messagepackDeserialize<T>(message: Buffer | Uint8Array): T {
  return decode(message) as T
}

export function messagepackSerialize<T>(value: T): Uint8Array {
  return encode(value)
}
