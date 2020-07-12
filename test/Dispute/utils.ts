import * as ethers from 'ethers'
import {
    deployContract,
  } from 'ethereum-waffle'
import {
    Address,
    BigNumber,
    Bytes,
    FixedBytes,
    Range,
    Struct,
    Property
  } from '@cryptoeconomicslab/primitives'
  import {
    DoubleLayerTree,
    DoubleLayerTreeLeaf
  } from '@cryptoeconomicslab/merkle-tree'
  import { Keccak256 } from '@cryptoeconomicslab/hash'
import EthCoder from '@cryptoeconomicslab/eth-coder'
import { StateUpdate } from '@cryptoeconomicslab/plasma'
import * as MockFalsyCompiledPredicate from '../../build/contracts/MockFalsyCompiledPredicate.json'
import * as MockCompiledPredicate from '../../build/contracts/MockCompiledPredicate.json'

export class DisputeTestSupport{
    private falsyCompiledPredicate!: ethers.Contract
    public truthyCompiledPredicate!: ethers.Contract
    private wallet: ethers.ethers.Wallet

    constructor(_wallet: ethers.ethers.Wallet){
        this.wallet = _wallet
    }
    public async setup(){
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
        const predicate = falsy ? this.falsyCompiledPredicate : this.truthyCompiledPredicate
        return new StateUpdate(
          Address.default(),
          Address.default(),
          new Range(BigNumber.from(start), BigNumber.from(end)),
          BigNumber.from(blockNumber),
          new Property(Address.from(predicate.address), [EthCoder.encode(owner)])
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
    const tokenAddress = Address.default()
  
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
  
    const tree = new DoubleLayerTree([leaf0, leaf1, leaf2, leaf3])
  
    return {
      root: tree.getRoot().toHexString(),
      inclusionProof: tree.getInclusionProofByAddressAndIndex(tokenAddress, 0),
      falsyInclusionProof: tree.getInclusionProofByAddressAndIndex(
        tokenAddress,
        1
      )
    }
  }

  export function encodeStructable(structable: { toStruct: () => Struct }) {
    return EthCoder.encode(structable.toStruct())
  }