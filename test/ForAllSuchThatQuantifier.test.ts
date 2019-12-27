import chai from 'chai'
import {
  createMockProvider,
  deployContract,
  getWallets,
  solidity
} from 'ethereum-waffle'
import * as Utils from '../build/contracts/Utils.json'
import * as MockAdjudicationContract from '../build/contracts/MockAdjudicationContract.json'
import * as MockChallenge from '../build/contracts/MockChallenge.json'
import * as ForAllSuchThatQuantifier from '../build/contracts/ForAllSuchThatQuantifier.json'
import * as AndPredicate from '../build/contracts/AndPredicate.json'
import * as NotPredicate from '../build/contracts/NotPredicate.json'
import * as TestPredicate from '../build/contracts/TestPredicate.json'
import * as ethers from 'ethers'
import {
  encodeProperty,
  encodeString,
  encodeVariable,
  OvmProperty
} from './helpers/utils'
import { FreeVariable } from 'wakkanay/dist/ovm/types'
chai.use(solidity)
chai.use(require('chai-as-promised'))
const { expect, assert } = chai

describe('ForAllSuchThatQuantifier', () => {
  let provider = createMockProvider()
  let wallets = getWallets(provider)
  let wallet = wallets[0]
  let utils
  let testPredicate: ethers.Contract
  let andPredicate: ethers.Contract
  let forAllSuchThatQuantifier: ethers.Contract
  let notPredicate: ethers.Contract
  let adjudicationContract: ethers.Contract
  let mockChallenge: ethers.Contract
  let trueProperty: OvmProperty,
    notTrueProperty: OvmProperty,
    forAllSuchThatProperty: OvmProperty

  beforeEach(async () => {
    mockChallenge = await deployContract(wallet, MockChallenge, [])
    utils = await deployContract(wallet, Utils, [])
    adjudicationContract = await deployContract(
      wallet,
      MockAdjudicationContract,
      [utils.address]
    )
    notPredicate = await deployContract(wallet, NotPredicate, [
      adjudicationContract.address,
      utils.address
    ])
    andPredicate = await deployContract(wallet, AndPredicate, [
      adjudicationContract.address,
      notPredicate.address,
      utils.address
    ])
    forAllSuchThatQuantifier = await deployContract(
      wallet,
      ForAllSuchThatQuantifier,
      [
        adjudicationContract.address,
        notPredicate.address,
        andPredicate.address,
        utils.address
      ]
    )
    testPredicate = await deployContract(wallet, TestPredicate, [
      adjudicationContract.address,
      utils.address
    ])
    trueProperty = {
      predicateAddress: testPredicate.address,
      inputs: ['0x01']
    }
    notTrueProperty = {
      predicateAddress: notPredicate.address,
      inputs: [
        encodeProperty({
          predicateAddress: testPredicate.address,
          inputs: ['0x01']
        })
      ]
    }
    forAllSuchThatProperty = {
      predicateAddress: forAllSuchThatQuantifier.address,
      inputs: [
        encodeProperty({
          predicateAddress: testPredicate.address,
          inputs: []
        }),
        encodeString('n'),
        encodeProperty({
          predicateAddress: testPredicate.address,
          // TODO: FreeVariable.from('n').toHexString()
          inputs: [encodeVariable('n')]
        })
      ]
    }
  })

  describe('isValidChallenge', () => {
    it('validate challenge with not(test(0x01)) to for all t such that Test(t)', async () => {
      const challengeInput = '0x01'
      const result = await mockChallenge.isValidChallenge(
        forAllSuchThatProperty,
        [challengeInput],
        notTrueProperty
      )
      assert.isTrue(result)
    })
    it('fail to validate challenge with test(0x01) to for all t such that Test(t)', async () => {
      const challengeInput = '0x01'
      await expect(
        mockChallenge.isValidChallenge(
          forAllSuchThatProperty,
          [challengeInput],
          trueProperty
        )
      ).to.be.reverted
    })
  })

  describe('set property as variable', () => {
    it('for all property such that: property()', async () => {
      const challengeInput = encodeProperty({
        predicateAddress: testPredicate.address,
        inputs: ['0x01']
      })
      const forAllSuchThatProperty = {
        predicateAddress: forAllSuchThatQuantifier.address,
        // TODO: FreeVariable.from('n').toHexString()
        inputs: ['0x', encodeString('n'), encodeVariable('n')]
      }
      mockChallenge.isValidChallenge(
        forAllSuchThatProperty,
        [challengeInput],
        notTrueProperty
      )
    })
  })
})
