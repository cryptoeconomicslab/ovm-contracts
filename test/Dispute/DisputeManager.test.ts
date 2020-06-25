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
    it('succeed to claim a new property', async () => {
      const inputs = ['0x01']
      const gameId = getGameIdFromProperty({
        predicateAddress: disputeContract.address,
        inputs
      })

      await expect(disputeContract.claim(inputs, [])).to.emit(
        disputeManager,
        'NewPropertyClaimed'
      )

      const game = await disputeManager.games(gameId)
      assert.equal(game.propertyHash, gameId)
      assert.equal(game.decision, DECISION.UNDECIDED)
    })

    it('fail to add an already claimed property', async () => {
      const inputs = ['0x01']
      await disputeContract.claim(inputs, [])
      await expect(disputeContract.claim(inputs, [])).to.be.revertedWith(
        'game is already started'
      )
    })

    it('fail to add predicate address does not match', async () => {
      const inputs = ['0x01']
      await expect(
        disputeContract.claimInvalidAddress(inputs, [])
      ).to.be.revertedWith('Method must be called from dispute contract')
    })
  })
})
