import chai from 'chai'
import {
  createMockProvider,
  deployContract,
  getWallets,
  solidity,
  link
} from 'ethereum-waffle'
import * as MockAdjudicationContract from '../../../build/MockAdjudicationContract.json'
import * as Utils from '../../../build/Utils.json'
import * as IsValidStateTransitionPredicate from '../../../build/IsValidStateTransitionPredicate.json'
import * as MockTxPredicate from '../../../build/MockTxPredicate.json'
import * as MockStateUpdatePredicate from '../../../build/MockStateUpdatePredicate.json'
import * as IsContainedPredicate from '../../../build/IsContainedPredicate.json'
import * as ethers from 'ethers'
const abi = new ethers.utils.AbiCoder()

chai.use(solidity)
chai.use(require('chai-as-promised'))
const { expect, assert } = chai

describe('IsValidStateTransition', () => {
  let provider = createMockProvider()
  let wallets = getWallets(provider)
  let wallet = wallets[0]
  let isValidStateTransitionPredicate: ethers.Contract
  let adjudicationContract: ethers.Contract
  let txPredicate: ethers.Contract
  let stateUpdatePredicate: ethers.Contract
  let isContainedPredicate: ethers.Contract

  beforeEach(async () => {
    const utils = await deployContract(wallet, Utils, [])
    txPredicate = await deployContract(wallet, MockTxPredicate, [])
    stateUpdatePredicate = await deployContract(
      wallet,
      MockStateUpdatePredicate,
      []
    )
    adjudicationContract = await deployContract(
      wallet,
      MockAdjudicationContract,
      [utils.address]
    )
    isContainedPredicate = await deployContract(wallet, IsContainedPredicate, [
      adjudicationContract.address,
      utils.address
    ])
    isValidStateTransitionPredicate = await deployContract(
      wallet,
      IsValidStateTransitionPredicate,
      [
        adjudicationContract.address,
        utils.address,
        txPredicate.address,
        isContainedPredicate.address
      ]
    )
  })

  describe('decide', () => {
    const token = ethers.constants.AddressZero
    const range = abi.encode(['tuple(uint256, uint256)'], [[100, 200]])
    const previousBlockNumber = abi.encode(['uint256'], [30])
    const blockNumber = abi.encode(['uint256'], [60])
    const previousOwner = wallets[0].address
    const owner = wallets[1].address
    let prevSu: string
    let tx: string
    let su: string

    beforeEach(() => {
      const previousStateObject = abi.encode(
        ['tuple(address, bytes[])'],
        [[stateUpdatePredicate.address, [previousOwner]]]
      )
      const stateObject = abi.encode(
        ['tuple(address, bytes[])'],
        [[stateUpdatePredicate.address, [owner]]]
      )
      prevSu = abi.encode(
        ['tuple(address, bytes[])'],
        [
          [
            stateUpdatePredicate.address,
            [token, range, previousBlockNumber, previousStateObject]
          ]
        ]
      )
      tx = abi.encode(
        ['tuple(address, bytes[])'],
        [
          [
            txPredicate.address,
            [token, range, previousBlockNumber, stateObject]
          ]
        ]
      )
      su = abi.encode(
        ['tuple(address, bytes[])'],
        [
          [
            stateUpdatePredicate.address,
            [token, range, blockNumber, stateObject]
          ]
        ]
      )
    })

    it('suceed to decide', async () => {
      const result = await isValidStateTransitionPredicate.decide([
        prevSu,
        tx,
        su
      ])
      expect(result).to.be.true
    })

    it('fail to decide with invalid transaction', async () => {
      const stateObject = abi.encode(
        ['tuple(address, bytes[])'],
        [[stateUpdatePredicate.address, [wallets[2].address]]]
      )
      const invalidTx = abi.encode(
        ['tuple(address, bytes[])'],
        [
          [
            txPredicate.address,
            [token, range, previousBlockNumber, stateObject]
          ]
        ]
      )
      await expect(
        isValidStateTransitionPredicate.decide([prevSu, invalidTx, su])
      ).to.be.revertedWith('state object must be same')
    })
  })
})
