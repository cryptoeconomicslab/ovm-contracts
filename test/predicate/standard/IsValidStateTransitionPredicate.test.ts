import chai from 'chai'
import {
  createMockProvider,
  deployContract,
  getWallets,
  solidity,
  link
} from 'ethereum-waffle'
import * as MockAdjudicationContract from '../../../build/contracts/MockAdjudicationContract.json'
import * as Utils from '../../../build/contracts/Utils.json'
import * as IsValidStateTransitionPredicate from '../../../build/contracts/IsValidStateTransitionPredicate.json'
import * as MockCompiledPredicate from '../../../build/contracts/MockCompiledPredicate.json'
import * as IsContainedPredicate from '../../../build/contracts/IsContainedPredicate.json'
import * as ethers from 'ethers'
import { encodeProperty, encodeRange, encodeInteger } from '../../helpers/utils'

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
    txPredicate = await deployContract(wallet, MockCompiledPredicate, [])
    stateUpdatePredicate = await deployContract(
      wallet,
      MockCompiledPredicate,
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
    const range = encodeRange(100, 200)
    const previousBlockNumber = encodeInteger(30)
    const blockNumber = encodeInteger(60)
    const previousOwner = wallets[0].address
    const owner = wallets[1].address
    let prevSu: string
    let tx: string
    let su: string

    beforeEach(() => {
      const previousStateObject = encodeProperty({
        predicateAddress: stateUpdatePredicate.address,
        inputs: [previousOwner]
      })
      const stateObject = encodeProperty({
        predicateAddress: stateUpdatePredicate.address,
        inputs: [owner]
      })
      prevSu = encodeProperty({
        predicateAddress: stateUpdatePredicate.address,
        inputs: [token, range, previousBlockNumber, previousStateObject]
      })
      tx = encodeProperty({
        predicateAddress: txPredicate.address,
        inputs: [token, range, previousBlockNumber, stateObject]
      })
      su = encodeProperty({
        predicateAddress: stateUpdatePredicate.address,
        inputs: [token, range, blockNumber, stateObject]
      })
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
      const stateObject = encodeProperty({
        predicateAddress: stateUpdatePredicate.address,
        inputs: [wallets[2].address]
      })
      const invalidTx = encodeProperty({
        predicateAddress: txPredicate.address,
        inputs: [token, range, previousBlockNumber, stateObject]
      })
      await expect(
        isValidStateTransitionPredicate.decide([prevSu, invalidTx, su])
      ).to.be.revertedWith('state object must be same')
    })
  })
})
