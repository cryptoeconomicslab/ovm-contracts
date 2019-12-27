import chai from 'chai'
import {
  createMockProvider,
  deployContract,
  getWallets,
  solidity
} from 'ethereum-waffle'
import * as MockAdjudicationContract from '../../../build/contracts/MockAdjudicationContract.json'
import * as MockChallenge from '../../../build/contracts/MockChallenge.json'
import * as MockAtomicPredicate from '../../../build/contracts/MockAtomicPredicate.json'
import * as Utils from '../../../build/contracts/Utils.json'
import * as OwnershipPredicate from '../../../build/contracts/OwnershipPredicate.json'
import * as ethers from 'ethers'
import {
  encodeProperty,
  encodeString,
  randomAddress,
  encodeVariable,
  encodeConstant,
  encodeLabel
} from '../../helpers/utils'

chai.use(solidity)
chai.use(require('chai-as-promised'))
const { expect, assert } = chai

describe('OwnershipPredicate', () => {
  let provider = createMockProvider()
  let wallets = getWallets(provider)
  let wallet = wallets[0]
  let ownershipPredicate: ethers.Contract
  let mockChallenge: ethers.Contract
  const notAddress = randomAddress()
  const andAddress = randomAddress()
  const equalAddress = randomAddress()
  const forAllSuchThatAddress = randomAddress()
  const isContainedAddress = randomAddress()
  const verifyInclusionAddress = randomAddress()
  const isLessThanAddress = randomAddress()
  const isSameAmountAddress = randomAddress()
  const ownershipPayout = randomAddress()
  const txAddress = randomAddress()
  let isValidSignatureAddress: string

  beforeEach(async () => {
    const utils = await deployContract(wallet, Utils, [])
    const adjudicationContract = await deployContract(
      wallet,
      MockAdjudicationContract,
      [false]
    )
    const mockAtomicPredicate = await deployContract(
      wallet,
      MockAtomicPredicate,
      []
    )
    isValidSignatureAddress = mockAtomicPredicate.address
    mockChallenge = await deployContract(wallet, MockChallenge, [])
    ownershipPredicate = await deployContract(wallet, OwnershipPredicate, [
      adjudicationContract.address,
      utils.address,
      notAddress,
      andAddress,
      forAllSuchThatAddress,
      encodeString('secp256k1')
    ])
    await ownershipPredicate.setPredicateAddresses(
      isLessThanAddress,
      equalAddress,
      isValidSignatureAddress,
      isContainedAddress,
      verifyInclusionAddress,
      isSameAmountAddress,
      ownershipPayout
    )
  })

  describe('setPredicateAddresses', () => {
    it('throw exception to update', async () => {
      await expect(
        ownershipPredicate.setPredicateAddresses(
          isLessThanAddress,
          equalAddress,
          isValidSignatureAddress,
          isContainedAddress,
          verifyInclusionAddress,
          isSameAmountAddress,
          ownershipPayout
        )
      ).to.be.revertedWith('isInitialized must be false')
    })
  })

  describe('isValidChallenge', () => {
    const transaction = '0x001234567890'
    it('return true', async () => {
      const ownershipProperty = {
        predicateAddress: ownershipPredicate.address,
        inputs: [encodeLabel('OwnershipT'), wallet.address, transaction]
      }
      const forAllSuchThatProperty = {
        predicateAddress: forAllSuchThatAddress,
        inputs: [
          '0x',
          encodeString('sig'),
          encodeProperty({
            predicateAddress: notAddress,
            inputs: [
              encodeProperty({
                predicateAddress: isValidSignatureAddress,
                inputs: [
                  transaction,
                  encodeVariable('sig'),
                  wallet.address,
                  encodeConstant('secp256k1')
                ]
              })
            ]
          })
        ]
      }
      const challengeInput = '0x'
      const result = await mockChallenge.isValidChallenge(
        ownershipProperty,
        [],
        forAllSuchThatProperty
      )
      assert.isTrue(result)
    })

    it('throw exception with invalid challenge', async () => {
      const ownershipProperty = {
        predicateAddress: ownershipPredicate.address,
        inputs: [encodeLabel('OwnershipT'), wallet.address, transaction]
      }
      const forAllSuchThatProperty = {
        predicateAddress: forAllSuchThatAddress,
        inputs: [
          '0x',
          encodeString('sig'),
          encodeProperty({
            predicateAddress: notAddress,
            inputs: [
              encodeProperty({
                predicateAddress: isValidSignatureAddress,
                inputs: [
                  transaction,
                  encodeVariable('sig'),
                  wallets[1].address,
                  encodeConstant('secp256k1')
                ]
              })
            ]
          })
        ]
      }
      const challengeInput = '0x'
      await expect(
        mockChallenge.isValidChallenge(
          ownershipProperty,
          [],
          forAllSuchThatProperty
        )
      ).to.be.revertedWith('_challenge must be valud child of game tree')
    })
  })

  describe('decide', () => {
    const transaction = '0x001234567890'
    const signature = '0x001234567890'
    it('return true', async () => {
      const result = await ownershipPredicate.decide(
        [encodeLabel('OwnershipT'), wallet.address, transaction],
        [signature]
      )
      assert.isTrue(result)
    })

    it('throw exception with invalid signature', async () => {
      await expect(
        ownershipPredicate.decide(
          [encodeLabel('OwnershipT'), wallet.address, encodeString('fail')],
          [signature]
        )
      ).to.be.reverted
    })
  })
})
