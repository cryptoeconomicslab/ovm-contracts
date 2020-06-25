import chai from 'chai'
import {
  createMockProvider,
  deployContract,
  getWallets,
  solidity
} from 'ethereum-waffle'
import * as Utils from '../../build/contracts/Utils.json'
import * as DisputeManager from '../../build/contracts/DisputeManager.json'
import * as MockDisputeContract from '../../build/contracts/MockDisputeContract.json'
import * as ethers from 'ethers'
const abi = new ethers.utils.AbiCoder()
import { increaseBlocks } from '../helpers/increaseBlocks'
import { getGameIdFromProperty } from '../helpers/utils'

chai.use(solidity)
chai.use(require('chai-as-promised'))
const { expect, assert } = chai

const DECISION = {
  UNDECIDED: 0,
  TRUE: 1,
  FALSE: 2
}

describe('DisputeManager', () => {
  let provider = createMockProvider()
  let wallets = getWallets(provider)
  let wallet = wallets[0]
  let utils: ethers.Contract,
    disputeManager: ethers.Contract,
    disputeContract: ethers.Contract

  before(async () => {
    utils = await deployContract(wallet, Utils, [])
  })

  beforeEach(async () => {
    disputeManager = await deployContract(wallet, DisputeManager, [
      utils.address
    ])
    disputeContract = await deployContract(wallet, MockDisputeContract, [
      disputeManager.address
    ])
  })

  describe('claim', () => {
    const inputs = ['0x01']

    describe('succeed to claim', () => {
      it('add a new game and emit event', async () => {
        const gameId = getGameIdFromProperty({
          predicateAddress: disputeContract.address,
          inputs
        })

        await expect(disputeContract.claim(inputs, [])).to.emit(
          disputeManager,
          'PropertyClaimed'
        )

        const game = await disputeManager.getGame(gameId)
        assert.equal(game.propertyHash, gameId)
        assert.equal(game.decision, DECISION.UNDECIDED)
      })
    })

    describe('fails to claim property', () => {
      it('already claimed property', async () => {
        await disputeContract.claim(inputs, [])
        await expect(disputeContract.claim(inputs, [])).to.be.revertedWith(
          'game is already started'
        )
      })

      it('predicate address does not match', async () => {
        await expect(
          disputeContract.claimInvalidAddress(inputs, [])
        ).to.be.revertedWith('Method must be called from dispute contract')
      })
    })
  })

  describe('challenge', () => {
    const inputs = ['0x01']
    const challengeInputs = ['0x02']

    beforeEach(async () => {
      await disputeContract.claim(inputs, [])
    })

    describe('succeed to challenge', () => {
      it('successfully add challenge and emit event', async () => {
        await expect(
          disputeContract.challenge(inputs, challengeInputs, [])
        ).to.emit(disputeManager, 'PropertyChallenged')

        const challengeGameId = getGameIdFromProperty({
          predicateAddress: disputeContract.address,
          inputs: challengeInputs
        })

        const challengeGame = await disputeManager.getGame(challengeGameId)
        assert.equal(challengeGame.propertyHash, challengeGameId)
        assert.equal(challengeGame.decision, DECISION.UNDECIDED)

        const gameId = getGameIdFromProperty({
          predicateAddress: disputeContract.address,
          inputs
        })
        const game = await disputeManager.getGame(gameId)
        assert.deepEqual(game.challenges, [challengeGameId])
      })
    })

    describe('fails to challenge', () => {
      it('property not claimed', async () => {
        const notClaimedInputs = ['0x05']
        await expect(
          disputeContract.challenge(notClaimedInputs, challengeInputs, [])
        ).to.be.revertedWith('property is not claimed')
      })

      it('challenge already been made', async () => {
        await disputeContract.challenge(inputs, challengeInputs, [])
        await expect(
          disputeContract.challenge(inputs, challengeInputs, [])
        ).to.be.revertedWith('challenge is already started')
      })

      it('predicate address does not match', async () => {
        await expect(
          disputeContract.challengeInvalidAddress(inputs, challengeInputs, [])
        ).to.be.revertedWith('Method must be called from dispute contract')
      })
    })
  })

  describe('removeChallenge', () => {
    const inputs = ['0x01']
    const challengeInputs = ['0x02']

    beforeEach(async () => {
      await disputeContract.claim(inputs, [])
      await disputeContract.challenge(inputs, challengeInputs, [])
    })

    describe('succeed to remove challenge', async () => {
      it('successfully remove challenge and emit event', async () => {
        await disputeContract.setGameResult(challengeInputs, false)

        await expect(
          disputeContract.removeChallenge(inputs, challengeInputs, [])
        ).to.emit(disputeManager, 'ChallengeRemoved')

        const gameId = getGameIdFromProperty({
          predicateAddress: disputeContract.address,
          inputs
        })
        const game = await disputeManager.getGame(gameId)
        assert.equal(game.challenges.length, 0)
      })
    })

    describe('fails to remove challenge', () => {
      const notClaimedInputs = ['0x05']
      it('property does not exist', async () => {
        await expect(
          disputeContract.removeChallenge(notClaimedInputs, challengeInputs, [])
        ).to.be.revertedWith('property is not claimed')
      })

      it('challengeProperty does not exist', async () => {
        await expect(
          disputeContract.removeChallenge(inputs, notClaimedInputs, [])
        ).to.be.revertedWith('challenge property is not claimed')
      })

      it('challengeProperty does not exist in challenge list', async () => {
        await disputeContract.claim(notClaimedInputs, [])
        await expect(
          disputeContract.removeChallenge(inputs, notClaimedInputs, [])
        ).to.be.revertedWith('challenge is not in the challenge list')
      })

      it('challengeProperty was decided to true', async () => {
        await disputeContract.setGameResult(challengeInputs, DECISION.TRUE)
        await expect(
          disputeContract.removeChallenge(inputs, challengeInputs, [])
        ).to.be.revertedWith('challenge property is not decided to false')
      })

      it('challengeProperty is undecided', async () => {
        await expect(
          disputeContract.removeChallenge(inputs, challengeInputs, [])
        ).to.be.revertedWith('challenge property is not decided to false')
      })

      it('predicate address does not match', async () => {
        await expect(
          disputeContract.removeChallengeInvalidAddress(
            inputs,
            challengeInputs,
            []
          )
        ).to.be.revertedWith('Method must be called from dispute contract')
      })
    })
  })
})
