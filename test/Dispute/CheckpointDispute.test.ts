import chai from 'chai'
import {
  createMockProvider,
  deployContract,
  getWallets,
  solidity,
  link
} from 'ethereum-waffle'
import * as Utils from '../../build/contracts/Utils.json'
import * as Deserializer from '../../build/contracts/Deserializer.json'
import * as Commitment from '../../build/contracts/Commitment.json'
import * as CommitmentVerifier from '../../build/contracts/CommitmentVerifier.json'
import * as DisputeManager from '../../build/contracts/DisputeManager.json'
import * as CheckpointDispute from '../../build/contracts/CheckpointDispute.json'
import * as MockCompiledPredicate from '../../build/contracts/MockCompiledPredicate.json'
import * as MockFalsyCompiledPredicate from '../../build/contracts/MockFalsyCompiledPredicate.json'
import * as ethers from 'ethers'
import { OvmProperty, encodeProperty } from '../helpers/utils'
import { Keccak256 } from '@cryptoeconomicslab/hash'
import {
  Address,
  BigNumber,
  Bytes,
  FixedBytes,
  Range
} from '@cryptoeconomicslab/primitives'
import {
  DoubleLayerTree,
  DoubleLayerTreeLeaf
} from '@cryptoeconomicslab/merkle-tree'
import { StateUpdate } from '@cryptoeconomicslab/plasma'
import { Property } from '@cryptoeconomicslab/ovm'
import EthCoder from '@cryptoeconomicslab/eth-coder'
import { setupContext } from '@cryptoeconomicslab/context'
setupContext({ coder: EthCoder })

chai.use(solidity)
chai.use(require('chai-as-promised'))
const { expect, assert } = chai

// generate merkle tree.
// returns its root and encoded inclusionProof of given state update.
function generateTree(stateUpdate: StateUpdate) {
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
  const leaf1 = generateDoubleLayerTreeLeaf(tokenAddress, 7, 'leaf1')
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

describe('CheckpointDispute', () => {
  let provider = createMockProvider()
  let wallets = getWallets(provider)
  let wallet = wallets[0]
  let ALICE_ADDRESS = wallets[1].address
  let utils: ethers.Contract,
    deserializer: ethers.Contract,
    disputeManager: ethers.Contract,
    checkpointDispute: ethers.Contract,
    commitment: ethers.Contract,
    commitmentVerifier: ethers.Contract,
    truthyCompiledPredicate: ethers.Contract,
    falsyCompiledPredicate: ethers.Contract

  before(async () => {
    utils = await deployContract(wallet, Utils, [])
    deserializer = await deployContract(wallet, Deserializer, [])

    // mock always decide to true
    truthyCompiledPredicate = await deployContract(
      wallet,
      MockCompiledPredicate,
      []
    )
    // mock always decide to false
    falsyCompiledPredicate = await deployContract(
      wallet,
      MockFalsyCompiledPredicate,
      []
    )
  })

  beforeEach(async () => {
    try {
      link(
        CheckpointDispute,
        'contracts/Library/Deserializer.sol:Deserializer',
        deserializer.address
      )
    } catch (e) {
      // link fail in second time.
    }
    commitment = await deployContract(wallet, Commitment, [wallet.address])
    commitmentVerifier = await deployContract(wallet, CommitmentVerifier, [
      commitment.address
    ])
    disputeManager = await deployContract(wallet, DisputeManager, [
      utils.address
    ])
    checkpointDispute = await deployContract(wallet, CheckpointDispute, [
      disputeManager.address,
      commitmentVerifier.address,
      utils.address
    ])
  })

  function ownershipStateUpdate(
    owner: Address,
    blockNumber: number,
    start: number,
    end: number
  ) {
    return new StateUpdate(
      Address.default(),
      Address.default(),
      new Range(BigNumber.from(start), BigNumber.from(end)),
      BigNumber.from(blockNumber),
      new Property(Address.from(truthyCompiledPredicate.address), [
        EthCoder.encode(owner)
      ])
    )
  }

  describe('claim', () => {
    describe('succeed to claim a checkpoint', () => {
      it('create a new checkpoint claim', async () => {
        const currentBlockNumber = await commitment.currentBlock()
        const nextBlockNumber = currentBlockNumber + 1

        const stateUpdate = ownershipStateUpdate(
          Address.from(ALICE_ADDRESS),
          nextBlockNumber,
          0,
          5
        )
        const { root, inclusionProof } = generateTree(stateUpdate)
        await commitment.submitRoot(nextBlockNumber, root)

        const inputs = [EthCoder.encode(stateUpdate.property.toStruct())]
        const witness = [EthCoder.encode(inclusionProof.toStruct())]

        await expect(
          checkpointDispute.claim(inputs, witness, {
            gasLimit: 1200000
          })
        ).to.emit(checkpointDispute, 'CheckpointClaimed')
      })
    })

    describe('fail to claim a checkpoint', () => {
      it('cannot decode stateUpdate', async () => {
        const inputs = ['0x01']
        await expect(
          checkpointDispute.claim(inputs, [], {
            gasLimit: 1200000
          })
        ).to.be.reverted
      })

      it('cannot decode inclusionProof', async () => {
        const currentBlockNumber = await commitment.currentBlock()
        const nextBlockNumber = currentBlockNumber + 1

        const stateUpdate = ownershipStateUpdate(
          Address.from(ALICE_ADDRESS),
          nextBlockNumber,
          0,
          5
        )
        const { root } = generateTree(stateUpdate)
        await commitment.submitRoot(nextBlockNumber, root)

        const inputs = [EthCoder.encode(stateUpdate.property.toStruct())]
        const witness = ['0x01']

        await expect(
          checkpointDispute.claim(inputs, witness, {
            gasLimit: 1200000
          })
        ).to.be.reverted
      })

      it('falsy inclusionProof', async () => {
        const currentBlockNumber = await commitment.currentBlock()
        const nextBlockNumber = currentBlockNumber + 1

        const stateUpdate = ownershipStateUpdate(
          Address.from(ALICE_ADDRESS),
          nextBlockNumber,
          0,
          5
        )
        const { root, falsyInclusionProof } = generateTree(stateUpdate)
        await commitment.submitRoot(nextBlockNumber, root)

        const inputs = [EthCoder.encode(stateUpdate.property.toStruct())]
        const witness = [EthCoder.encode(falsyInclusionProof.toStruct())]

        await expect(
          checkpointDispute.claim(inputs, witness, {
            gasLimit: 1200000
          })
        ).to.be.reverted
      })
    })
  })

  describe.skip('challenge', () => {})

  describe.skip('remove challenge', () => {})
})
