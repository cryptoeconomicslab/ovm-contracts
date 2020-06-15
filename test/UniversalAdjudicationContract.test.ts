/* contract imports */
import chai from 'chai'
import {
  createMockProvider,
  deployContract,
  getWallets,
  solidity
} from 'ethereum-waffle'
import * as UniversalAdjudicationContract from '../build/contracts/UniversalAdjudicationContract.json'
import * as Utils from '../build/contracts/Utils.json'
import * as NotPredicate from '../build/contracts/NotPredicate.json'
import * as OrPredicate from '../build/contracts/OrPredicate.json'
import * as AndPredicate from '../build/contracts/AndPredicate.json'
import * as TestPredicate from '../build/contracts/TestPredicate.json'
import * as ThereExistsSuchThatQuantifier from '../build/contracts/ThereExistsSuchThatQuantifier.json'
import * as ForAllSuchThatQuantifier from '../build/contracts/ForAllSuchThatQuantifier.json'
import * as EqualPredicate from '../build/contracts/EqualPredicate.json'
import * as ethers from 'ethers'
const abi = new ethers.utils.AbiCoder()
import { increaseBlocks } from './helpers/increaseBlocks'
import {
  getGameIdFromProperty,
  OvmProperty,
  randomAddress,
  encodeProperty,
  encodeString,
  encodeVariable
} from './helpers/utils'

chai.use(solidity)
chai.use(require('chai-as-promised'))
const { expect, assert } = chai

describe('UniversalAdjudicationContract', () => {
  let provider = createMockProvider()
  let wallets = getWallets(provider)
  let wallet = wallets[0]
  let adjudicationContract: ethers.Contract,
    utils: ethers.Contract,
    testPredicate: ethers.Contract,
    notPredicate: ethers.Contract,
    orPredicate: ethers.Contract,
    andPredicate: ethers.Contract,
    thereExistsSuchThatQuantifier: ethers.Contract,
    forAllQuantifier: ethers.Contract,
    equalPredicate: ethers.Contract
  let trueProperty: OvmProperty,
    falseProperty: OvmProperty,
    notProperty: OvmProperty,
    notFalseProperty: OvmProperty,
    thereProperty: OvmProperty
  const Undecided = 0
  const True = 1
  const False = 2

  beforeEach(async () => {
    utils = await deployContract(wallet, Utils, [])
    adjudicationContract = await deployContract(
      wallet,
      UniversalAdjudicationContract,
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
    orPredicate = await deployContract(wallet, OrPredicate, [
      notPredicate.address,
      andPredicate.address
    ])
    forAllQuantifier = await deployContract(wallet, ForAllSuchThatQuantifier, [
      adjudicationContract.address,
      notPredicate.address,
      andPredicate.address,
      utils.address
    ])

    thereExistsSuchThatQuantifier = await deployContract(
      wallet,
      ThereExistsSuchThatQuantifier,
      [
        notPredicate.address,
        andPredicate.address,
        orPredicate.address,
        forAllQuantifier.address,
        utils.address
      ]
    )
    equalPredicate = await deployContract(wallet, EqualPredicate, [
      adjudicationContract.address,
      utils.address
    ])
    testPredicate = await deployContract(wallet, TestPredicate, [
      adjudicationContract.address,
      utils.address
    ])
    trueProperty = {
      predicateAddress: testPredicate.address,
      inputs: ['0x01']
    }
    falseProperty = {
      predicateAddress: testPredicate.address,
      inputs: []
    }
    notProperty = {
      predicateAddress: notPredicate.address,
      inputs: [
        abi.encode(
          ['tuple(address, bytes[])'],
          [[testPredicate.address, ['0x01']]]
        )
      ]
    }
    notFalseProperty = {
      predicateAddress: notPredicate.address,
      inputs: [
        abi.encode(['tuple(address, bytes[])'], [[testPredicate.address, []]])
      ]
    }
    thereProperty = {
      predicateAddress: thereExistsSuchThatQuantifier.address,
      inputs: [
        encodeString(''),
        encodeString('n'),
        encodeProperty({
          predicateAddress: equalPredicate.address,
          inputs: [encodeVariable('n'), '0x01']
        })
      ]
    }
  })

  describe('claimProperty', () => {
    it('adds a claim', async () => {
      const claimId = getGameIdFromProperty(notProperty)
      await expect(adjudicationContract.claimProperty(notProperty)).to.emit(
        adjudicationContract,
        'NewPropertyClaimed'
      )
      const game = await adjudicationContract.getGame(claimId)

      // check newly stored property is equal to the claimed property
      assert.equal(game.propertyHash, claimId)
      assert.equal(game.decision, Undecided)
    })
    it('fails to add an already claimed property and throws Error', async () => {
      // claim a property
      await adjudicationContract.claimProperty(trueProperty)
      // check if the second call of the claimProperty function throws an error
      await expect(adjudicationContract.claimProperty(trueProperty)).to.be
        .reverted
    })
    it('check gas cost', async () => {
      let gasCost = await adjudicationContract.estimate.claimProperty(trueProperty)
      expect(gasCost.toNumber()).to.be.lt(90000)
      gasCost = await adjudicationContract.estimate.claimProperty(notProperty)
      expect(gasCost.toNumber()).to.be.lt(95000)
    })
  })

  describe('challenge', () => {
    it('not(true) is challenged by true', async () => {
      await adjudicationContract.claimProperty(notProperty)
      await adjudicationContract.claimProperty(trueProperty)
      const gameId = getGameIdFromProperty(notProperty)
      const challengingGameId = getGameIdFromProperty(trueProperty)
      await expect(
        adjudicationContract.challenge(notProperty, ['0x'], trueProperty)
      )
        .to.emit(adjudicationContract, 'ClaimChallenged')
        .withArgs(gameId, challengingGameId)
      const game = await adjudicationContract.getGame(gameId)

      assert.equal(game.challenges.length, 1)
    })
    it('not(true) fail to be challenged by not(false)', async () => {
      await adjudicationContract.claimProperty(notProperty)
      await adjudicationContract.claimProperty(notFalseProperty)
      await expect(
        adjudicationContract.challenge(notProperty, ['0x'], notFalseProperty)
      ).to.be.reverted
    })
  })

  describe('decideClaimToFalse', () => {
    it('not(true) decided false with a challenge by true', async () => {
      await adjudicationContract.claimProperty(notProperty)
      await adjudicationContract.claimProperty(trueProperty)
      const gameId = getGameIdFromProperty(notProperty)
      await adjudicationContract.challenge(notProperty, ['0x'], trueProperty)
      await testPredicate.decideTrue(['0x01'])
      await expect(
        adjudicationContract.decideClaimToFalse(notProperty, trueProperty)
      )
        .to.emit(adjudicationContract, 'ClaimDecided')
        .withArgs(gameId, false)
      const game = await adjudicationContract.getGame(gameId)
      // game should be decided false
      assert.equal(game.decision, False)
    })
    it('not(false) fail to decided false without challenges', async () => {
      await adjudicationContract.claimProperty(notFalseProperty)
      await adjudicationContract.claimProperty(falseProperty)
      await adjudicationContract.challenge(
        notFalseProperty,
        ['0x'],
        falseProperty
      )
      await expect(
        adjudicationContract.decideClaimToFalse(notFalseProperty, falseProperty)
      ).to.be.reverted
    })
  })

  describe('decideClaimToTrue', () => {
    it('not(true) decided true because there are no challenges', async () => {
      await adjudicationContract.claimProperty(notProperty)
      const gameId = getGameIdFromProperty(notProperty)
      // increase 10 blocks to pass dispute period
      await increaseBlocks(wallets, 10)
      await expect(adjudicationContract.decideClaimToTrue(gameId))
        .to.emit(adjudicationContract, 'ClaimDecided')
        .withArgs(gameId, true)

      const game = await adjudicationContract.getGame(gameId)
      // game should be decided true
      assert.equal(game.decision, True)
    })
    it('fail to decided true because dispute period has not passed', async () => {
      await adjudicationContract.claimProperty(notProperty)
      const gameId = getGameIdFromProperty(notProperty)
      await expect(adjudicationContract.decideClaimToTrue(gameId)).to.be
        .reverted
    })
    it('check gas cost', async () => {
      await adjudicationContract.claimProperty(notProperty)
      const gameId = getGameIdFromProperty(notProperty)
      const gasCost = await adjudicationContract.estimate.decideClaimToTrue(gameId)
      expect(gasCost.toNumber()).to.be.lt(26000)
    })
  })

  describe('decideClaimWithWitness', () => {
    it('can not decide not initiated game', async () => {
      const witness = ['0x01']

      await expect(
        adjudicationContract.decideClaimWithWitness(thereProperty, witness)
      ).to.be.reverted
    })

    it('decide to be true given correct witness for Or property', async () => {
      const property = {
        predicateAddress: orPredicate.address,
        inputs: [
          // True property
          abi.encode(
            ['tuple(address, bytes[])'],
            [[testPredicate.address, ['0x01']]]
          ),
          // False property
          abi.encode(['tuple(address, bytes[])'], [[testPredicate.address, []]])
        ]
      }

      const witness = [
        '0x0000000000000000000000000000000000000000000000000000000000000000'
      ]

      await adjudicationContract.claimProperty(property)
      const gameId = getGameIdFromProperty(property)

      await expect(
        adjudicationContract.decideClaimWithWitness(property, witness)
      ).to.not.be.reverted
      const game = await adjudicationContract.getGame(gameId)
      assert.equal(game.decision, True)
    })

    it('decide to be true given correct witness for ThereExists property', async () => {
      await adjudicationContract.claimProperty(thereProperty)
      const gameId = getGameIdFromProperty(thereProperty)
      const witness = ['0x01']

      await expect(
        adjudicationContract.decideClaimWithWitness(thereProperty, witness)
      ).to.not.be.reverted
      const game = await adjudicationContract.getGame(gameId)
      assert.equal(game.decision, True)
    })

    it('decide to be true nested property ThereExists(Or(Atomic)) property', async () => {
      const property = {
        predicateAddress: thereExistsSuchThatQuantifier.address,
        inputs: [
          encodeString(''),
          encodeString('n'),
          encodeProperty({
            predicateAddress: orPredicate.address,
            inputs: [
              // Equal property
              abi.encode(
                ['tuple(address, bytes[])'],
                [[equalPredicate.address, ['0x01', encodeVariable('n')]]]
              ),
              // False property
              abi.encode(
                ['tuple(address, bytes[])'],
                [[testPredicate.address, []]]
              )
            ]
          })
        ]
      }

      const witness = [
        '0x01', // witness for there exists property
        '0x0000000000000000000000000000000000000000000000000000000000000000' // witness for or property
      ]

      await adjudicationContract.claimProperty(property)
      const gameId = getGameIdFromProperty(property)

      await expect(
        adjudicationContract.decideClaimWithWitness(property, witness)
      ).to.be.not.reverted
      const game = await adjudicationContract.getGame(gameId)
      assert.equal(game.decision, True)
    })

    it('decide to be true nested property Or(ThereExists(Atomic)) property', async () => {
      const property = {
        predicateAddress: orPredicate.address,
        inputs: [
          abi.encode(
            ['tuple(address, bytes[])'],
            [[testPredicate.address, []]]
          ),
          abi.encode(
            ['tuple(address, bytes[])'],
            [
              [
                thereExistsSuchThatQuantifier.address,
                [
                  encodeString(''),
                  encodeString('n'),
                  encodeProperty({
                    predicateAddress: equalPredicate.address,
                    inputs: ['0x01', encodeVariable('n')]
                  })
                ]
              ]
            ]
          )
        ]
      }

      const witness = [
        '0x0000000000000000000000000000000000000000000000000000000000000001', // witness for or property
        '0x01' // witness for there exists property
      ]

      await adjudicationContract.claimProperty(property)
      const gameId = getGameIdFromProperty(property)

      await expect(
        adjudicationContract.decideClaimWithWitness(property, witness)
      ).to.be.not.reverted
      const game = await adjudicationContract.getGame(gameId)
      assert.equal(game.decision, True)
    })

    it('cannot decide to be true with ForAll property', async () => {
      const property = {
        predicateAddress: forAllQuantifier.address,
        inputs: [
          encodeProperty({
            predicateAddress: testPredicate.address,
            inputs: []
          }),
          encodeString('n'),
          encodeProperty({
            predicateAddress: testPredicate.address,
            inputs: [encodeVariable('n')]
          })
        ]
      }

      const witness = ['0x01']

      await adjudicationContract.claimProperty(property)
      const gameId = getGameIdFromProperty(property)

      await expect(
        adjudicationContract.decideClaimWithWitness(property, witness)
      ).to.be.reverted
      const game = await adjudicationContract.getGame(gameId)
      assert.equal(game.decision, Undecided)
    })

    it('cannot decide to be true with And property', async () => {
      const property = {
        predicateAddress: andPredicate.address,
        inputs: [
          encodeProperty({
            predicateAddress: testPredicate.address,
            inputs: []
          }),
          encodeProperty({
            predicateAddress: testPredicate.address,
            inputs: ['0x01']
          })
        ]
      }

      const witness = ['0x01']

      await adjudicationContract.claimProperty(property)
      const gameId = getGameIdFromProperty(property)

      await expect(
        adjudicationContract.decideClaimWithWitness(property, witness)
      ).to.be.reverted
      const game = await adjudicationContract.getGame(gameId)
      assert.equal(game.decision, Undecided)
    })

    it('cannot decide with invalid witness for Or property', async () => {
      const property = {
        predicateAddress: orPredicate.address,
        inputs: [
          // True property
          abi.encode(
            ['tuple(address, bytes[])'],
            [[testPredicate.address, ['0x01']]]
          ),
          // False property
          abi.encode(['tuple(address, bytes[])'], [[testPredicate.address, []]])
        ]
      }

      const witness = [
        '0x0000000000000000000000000000000000000000000000000000000000000003'
      ]

      await adjudicationContract.claimProperty(property)

      await expect(
        adjudicationContract.decideClaimWithWitness(property, witness)
      ).to.be.reverted
    })

    it('cannot decide with invalid witness for ThereExists property', async () => {
      await adjudicationContract.claimProperty(thereProperty)
      const gameId = getGameIdFromProperty(thereProperty)
      const witness = ['0x03']

      await expect(
        adjudicationContract.decideClaimWithWitness(thereProperty, witness)
      ).to.be.reverted
      const game = await adjudicationContract.getGame(gameId)
      assert.equal(game.decision, Undecided)
    })
  })

  describe('setPredicateDecision', () => {
    it('decide bool(true) decided true', async () => {
      await adjudicationContract.claimProperty(trueProperty)
      const gameId = getGameIdFromProperty(trueProperty)
      await expect(testPredicate.decideTrue(trueProperty.inputs)).to.emit(
        adjudicationContract,
        'AtomicPropositionDecided'
      )
      const game = await adjudicationContract.getGame(gameId)
      assert.equal(game.decision, True)
    })
    it('decide bool(false) decided false', async () => {
      await adjudicationContract.claimProperty(falseProperty)
      const gameId = getGameIdFromProperty(falseProperty)
      await testPredicate.decideFalse(falseProperty.inputs)
      const game = await adjudicationContract.getGame(gameId)
      assert.equal(game.decision, False)
    })
    it('fail to call setPredicateDecision directlly', async () => {
      await adjudicationContract.claimProperty(trueProperty)
      await expect(
        adjudicationContract.setPredicateDecision(trueProperty, true)
      ).to.be.reverted
    })
  })

  describe('removeChallenge', () => {
    // We can remove "False" challenge from game.
    it('remove false from not(false)', async () => {
      await adjudicationContract.claimProperty(notFalseProperty)
      await adjudicationContract.claimProperty(falseProperty)
      const gameId = getGameIdFromProperty(notFalseProperty)
      const challengeGameId = getGameIdFromProperty(falseProperty)
      await adjudicationContract.challenge(
        notFalseProperty,
        ['0x'],
        falseProperty
      )
      await testPredicate.decideFalse(falseProperty.inputs)
      await expect(
        adjudicationContract.removeChallenge(notFalseProperty, falseProperty)
      )
        .to.emit(adjudicationContract, 'ChallengeRemoved')
        .withArgs(gameId, challengeGameId)
      const game = await adjudicationContract.getGame(gameId)
      assert.equal(game.challenges.length, 0)
    })
    it('fail to remove undecided challenge', async () => {
      await adjudicationContract.claimProperty(notFalseProperty)
      await adjudicationContract.claimProperty(falseProperty)
      const gameId = getGameIdFromProperty(notFalseProperty)
      const challengeGameId = getGameIdFromProperty(falseProperty)
      await adjudicationContract.challenge(
        notFalseProperty,
        ['0x'],
        falseProperty
      )
      await expect(
        adjudicationContract.removeChallenge(notFalseProperty, falseProperty)
      ).to.be.reverted
    })
    it('fail to remove true from not(true)', async () => {
      await adjudicationContract.claimProperty(notProperty)
      await adjudicationContract.claimProperty(trueProperty)
      const gameId = getGameIdFromProperty(notProperty)
      const challengeGameId = getGameIdFromProperty(trueProperty)
      await adjudicationContract.challenge(notProperty, ['0x'], trueProperty)
      await testPredicate.decideTrue(trueProperty.inputs)
      await expect(
        adjudicationContract.removeChallenge(notProperty, trueProperty)
      ).to.be.reverted
    })
  })

  describe('isDecidable', () => {
    it('returns false when dispute period has not passed yet', async () => {
      await adjudicationContract.claimProperty(trueProperty)
      const gameId = getGameIdFromProperty(trueProperty)
      const decidable = await adjudicationContract.isDecidable(gameId)
      expect(decidable).false
    })

    it('returns false when challenge is not empty', async () => {
      await adjudicationContract.claimProperty(notProperty)
      await adjudicationContract.claimProperty(trueProperty)
      const gameId = getGameIdFromProperty(notProperty)
      const challengeGameId = getGameIdFromProperty(trueProperty)
      await adjudicationContract.challenge(notProperty, ['0x'], trueProperty)

      const decidable = await adjudicationContract.isDecidable(gameId)
      expect(decidable).false
    })

    it('returns true when dispute period has passed and no challenge remains', async () => {
      await adjudicationContract.claimProperty(trueProperty)
      const gameId = getGameIdFromProperty(trueProperty)
      await increaseBlocks(wallets, 7)
      const decidable = await adjudicationContract.isDecidable(gameId)
      expect(decidable).true
    })
  })
})
