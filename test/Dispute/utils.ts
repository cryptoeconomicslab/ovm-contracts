import * as ethers from 'ethers'
import { deployContract } from 'ethereum-waffle'
import JSBI from 'jsbi'
import {
  Address,
  BigNumber,
  Bytes,
  FixedBytes,
  Integer,
  Range,
  Struct,
  Property,
  List
} from '@cryptoeconomicslab/primitives'
import {
  DoubleLayerTree,
  DoubleLayerTreeLeaf
} from '@cryptoeconomicslab/merkle-tree'
import { Keccak256 } from '@cryptoeconomicslab/hash'
import EthCoder from '@cryptoeconomicslab/eth-coder'
import {
  StateUpdate,
  UnsignedTransaction,
  Transaction
} from '@cryptoeconomicslab/plasma'
import * as MockFalsyCompiledPredicate from '../../build/contracts/MockFalsyCompiledPredicate.json'
import * as MockCompiledPredicate from '../../build/contracts/MockCompiledPredicate.json'

export class DisputeTestSupport {
  public falsyCompiledPredicate!: ethers.Contract
  public truthyCompiledPredicate!: ethers.Contract
  private wallet: ethers.ethers.Wallet

  constructor(_wallet: ethers.ethers.Wallet) {
    this.wallet = _wallet
  }
  public async setup() {
    this.truthyCompiledPredicate = await deployContract(
      this.wallet,
      MockCompiledPredicate,
      []
    )
    this.falsyCompiledPredicate = await deployContract(
      this.wallet,
      MockFalsyCompiledPredicate,
      []
    )
  }
  public ownershipStateUpdate(
    owner: Address,
    blockNumber: number,
    start: number,
    end: number,
    falsy?: boolean
  ) {
    const predicate = falsy
      ? this.falsyCompiledPredicate
      : this.truthyCompiledPredicate
    return new StateUpdate(
      Address.default(),
      new Range(BigNumber.from(start), BigNumber.from(end)),
      BigNumber.from(blockNumber),
      new Property(Address.from(predicate.address), [EthCoder.encode(owner)]),
      FixedBytes.default(32)
    )
  }
  public ownershipTransaction(
    owner: Address,
    blockNumber: number,
    start: number,
    end: number,
    compiledPredicate: Address,
    falsy: boolean = false,
    depositContractAddress: Address = Address.default()
  ) {
    const predicate = falsy
      ? this.falsyCompiledPredicate
      : this.truthyCompiledPredicate
    const range = new Range(BigNumber.from(start), BigNumber.from(end))
    const block = BigNumber.from(blockNumber)
    const property = new Property(compiledPredicate, [])
    return new UnsignedTransaction(
      depositContractAddress,
      range,
      block,
      new Property(Address.from(predicate.address), [
        EthCoder.encode(owner),
        range.toBytes(),
        EthCoder.encode(block),
        EthCoder.encode(property.toStruct())
      ]),
      FixedBytes.default(32),
      Address.default()
    )
  }
  public prepareBlock(owner: string, blockNumber: number, falsy?: boolean) {
    const su = this.ownershipStateUpdate(
      Address.from(owner),
      blockNumber,
      0,
      5,
      falsy
    )
    const falsySU = this.ownershipStateUpdate(
      Address.from(owner),
      blockNumber,
      10,
      20
    )
    const tree = generateTree(su, falsySU)
    return {
      stateUpdate: su,
      falsySU,
      ...tree
    }
  }
}
export function generateTree(
  stateUpdate: StateUpdate,
  falsyStateUpdate?: StateUpdate
) {
  function generateDoubleLayerTreeLeaf(
    address: Address,
    bn: number,
    data: string
  ) {
    return new DoubleLayerTreeLeaf(
      address,
      BigNumber.from(bn),
      FixedBytes.from(32, Keccak256.hash(Bytes.fromString(data)).data)
    )
  }
  const tokenAddress = stateUpdate.depositContractAddress

  // leaf0 : include given state object
  const leaf0 = new DoubleLayerTreeLeaf(
    stateUpdate.depositContractAddress,
    stateUpdate.range.start,
    FixedBytes.from(
      32,
      Keccak256.hash(EthCoder.encode(stateUpdate.stateObject.toStruct())).data
    )
  )

  // random leaf for merkle tree
  const leaf1 = falsyStateUpdate
    ? new DoubleLayerTreeLeaf(
        falsyStateUpdate.depositContractAddress,
        falsyStateUpdate.range.start,
        FixedBytes.from(
          32,
          Keccak256.hash(
            EthCoder.encode(falsyStateUpdate.stateObject.toStruct())
          ).data
        )
      )
    : generateDoubleLayerTreeLeaf(tokenAddress, 7, 'leaf1')
  const leaf2 = generateDoubleLayerTreeLeaf(tokenAddress, 16, 'leaf2')
  const leaf3 = generateDoubleLayerTreeLeaf(tokenAddress, 100, 'leaf3')
  const leaves = [leaf0, leaf1, leaf2, leaf3]
  if (!falsyStateUpdate) {
    leaves.sort((a, b) => {
      if (JSBI.greaterThan(a.start.data, b.start.data)) {
        return 1
      } else if (JSBI.equal(a.start.data, b.start.data)) {
        return 0
      } else {
        return -1
      }
    })
  }

  const tree = new DoubleLayerTree(leaves)

  return {
    root: tree.getRoot().toHexString(),
    inclusionProof: tree.getInclusionProofByAddressAndIndex(
      tokenAddress,
      tree.findIndexByInterval(stateUpdate.range.start) || 0
    ),
    falsyInclusionProof: tree.getInclusionProofByAddressAndIndex(
      tokenAddress,
      falsyStateUpdate
        ? tree.findIndexByInterval(falsyStateUpdate.range.start) || 1
        : 1
    )
  }
}

export function encodeStructable(structable: { toStruct: () => Struct }) {
  return EthCoder.encode(structable.toStruct())
}

export function toStateUpdateStruct(data: StateUpdate): Struct {
  return new Struct([
    { key: 'depositContractAddress', value: data.depositContractAddress },
    { key: 'range', value: data.range.toStruct() },
    { key: 'blockNumber', value: data.blockNumber },
    { key: 'stateObject', value: data.stateObject.toStruct() },
    { key: 'chunkId', value: data.chunkId }
  ])
}

export function toTransactionStruct(data: Transaction): Struct {
  return new Struct([
    { key: 'depositContractAddress', value: data.depositContractAddress },
    { key: 'range', value: data.range.toStruct() },
    { key: 'maxBlockNumber', value: data.maxBlockNumber },
    { key: 'nextStateObject', value: data.stateObject.toStruct() },
    { key: 'chunkId', value: data.chunkId }
  ])
}

export function toExitStruct(
  isCheckpoint: boolean,
  su: StateUpdate,
  range: Range
): Struct {
  return new Struct([
    { key: 'isCheckpoint', value: Integer.from(isCheckpoint ? 1 : 0) },
    { key: 'stateUpdate', value: toStateUpdateStruct(su) },
    { key: 'range', value: range.toStruct() }
  ])
}

export function toBatchExitId(exitItems: Struct[]): Bytes {
  return Keccak256.hash(
    EthCoder.encode(
      List.from(
        {
          default: () => exitItems[0]
        },
        exitItems
      )
    )
  )
}

export function stateUpdateToLog(stateUpdate: StateUpdate) {
  return [
    stateUpdate.depositContractAddress.data,
    { start: stateUpdate.range.start.raw, end: stateUpdate.range.end.raw },
    ethers.utils.bigNumberify(stateUpdate.blockNumber.raw),
    {
      predicateAddress: stateUpdate.stateObject.deciderAddress.data,
      inputs: stateUpdate.stateObject.inputs
    },
    stateUpdate.chunkId.toHexString()
  ]
}
