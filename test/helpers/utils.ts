import {
  arrayify,
  concat,
  hexlify,
  keccak256,
  padZeros,
  randomBytes,
  toUtf8Bytes,
  AbiCoder
} from 'ethers/utils'
const abi = new AbiCoder()

export interface OvmProperty {
  predicateAddress: string
  inputs: string[]
}

export function getGameIdFromProperty(ovmProperty: OvmProperty) {
  return keccak256(
    abi.encode(
      ['tuple(address, bytes[])'],
      [[ovmProperty.predicateAddress, ovmProperty.inputs]]
    )
  )
}

function concatHex(hexArr: string[]): string {
  return hexlify(concat(hexArr.map(arrayify)))
}

export function prefix(_prefix: string, _source: string): string {
  return concatHex([hexlify(toUtf8Bytes(_prefix)), _source])
}

export function encodeRange(start: number, end: number) {
  return abi.encode(['tuple(uint256, uint256)'], [[start, end]])
}

export function encodeInteger(int: number) {
  return abi.encode(['uint256'], [int])
}

export function encodeProperty(property: OvmProperty) {
  return abi.encode(
    ['tuple(address, bytes[])'],
    [[property.predicateAddress, property.inputs]]
  )
}

export function encodeString(str: string) {
  return hexlify(toUtf8Bytes(str))
}

export function encodeLabel(str: string) {
  return prefix('L', encodeString(str))
}

export function encodeVariable(str: string) {
  return prefix('V', encodeString(str))
}

export function encodeConstant(str: string) {
  return encodeString(str)
}

export function encodeAddress(address: string) {
  return abi.encode(['address'], [address])
}

export function randomAddress() {
  return hexlify(randomBytes(20))
}
