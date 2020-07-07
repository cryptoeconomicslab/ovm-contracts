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
import * as ExitDispute from '../../build/contracts/ExitDispute.json'
import * as MockCompiledPredicate from '../../build/contracts/MockCompiledPredicate.json'
import * as MockFalsyCompiledPredicate from '../../build/contracts/MockFalsyCompiledPredicate.json'
import * as ethers from 'ethers'
import { Keccak256 } from '@cryptoeconomicslab/hash'
import {
  Address,
  BigNumber,
  Bytes,
  FixedBytes,
  Range,
  Struct
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



describe('ExitDispute', () => {
  const provider = createMockProvider()
  const wallets = getWallets(provider)
  const wallet = wallets[0]
  let deserializer: ethers.Contract
  let utils: ethers.Contract
  let disputeManager: ethers.Contract
  let exitDispute: ethers.Contract

  before(async () => {
    utils = await deployContract(wallet, Utils, [])
    deserializer = await deployContract(wallet, Deserializer, [])
  })

  beforeEach(async () => {
    try {
      link(
        ExitDispute,
        'contracts/Library/Deserializer.sol:Deserializer',
        deserializer.address
      )
    } catch (e) {
      // link fail in second time.
    }
    disputeManager = await deployContract(wallet, DisputeManager, [
      utils.address
    ])
    exitDispute = await deployContract(wallet, ExitDispute, [
      disputeManager.address
    ])
  })


  describe('claim', () => {

  })

  describe('challenge', () => {

    })

  describe('settle', () => {

  })
})
