import chai from 'chai'
import {
  createMockProvider,
  deployContract,
  getWallets,
  solidity,
  link
} from 'ethereum-waffle'
import * as Deserializer from '../../build/contracts/Deserializer.json'
import * as MockCompiledPredicate from '../../build/contracts/MockCompiledPredicate.json'
import * as SpentChallengeValidator from '../../build/contracts/SpentChallengeValidator.json'
import * as ethers from 'ethers'
import {
  Address,
  Struct,
} from '@cryptoeconomicslab/primitives'
import EthCoder from '@cryptoeconomicslab/eth-coder'
import { setupContext } from '@cryptoeconomicslab/context'
import {DisputeTestSupport, toStateUpdateStruct, toTransactionStruct} from './utils'
setupContext({ coder: EthCoder })

chai.use(solidity)
chai.use(require('chai-as-promised'))
const { expect, assert } = chai



describe('SpentChallengeValidator', () => {
  const provider = createMockProvider()
  const wallets = getWallets(provider)
  const wallet = wallets[0]
  const ALICE_ADDRESS = wallets[1].address
  const BOB_ADDRESS = wallets[2].address
  const support = new DisputeTestSupport(wallet)
  let mockCompiledPredicate: ethers.Contract
  let spentChallengeValidator: ethers.Contract
  let deserializer: ethers.Contract

  before(async () => {
    deserializer = await deployContract(wallet, Deserializer, [])
    mockCompiledPredicate = await deployContract(wallet, MockCompiledPredicate, [])
    await support.setup()
  })

  beforeEach(async () => {
    try {
      link(
        SpentChallengeValidator,
        'contracts/Library/Deserializer.sol:Deserializer',
        deserializer.address
      )
    } catch (e) {
      // link fail in second time.
    }
    spentChallengeValidator = await deployContract(wallet, SpentChallengeValidator, [])
  })


  describe('validateSpentChallenge', () => {
    it('succeed', async () => {
      await mockCompiledPredicate.setDicideReturn(true)
        const statusUpdate = support.ownershipStateUpdate(
          Address.from(ALICE_ADDRESS),
          1000000,
          0,
          5
        )

        const inputs = [EthCoder.encode(toStateUpdateStruct(statusUpdate))]
        const transaction = support.ownershipTransaction(
            Address.from(ALICE_ADDRESS),
            1000000,
            0,
            5,
            Address.from(mockCompiledPredicate.address)
          )
        const challengeInputs = [EthCoder.encode(toTransactionStruct(transaction))]
        const witness = [EthCoder.encode(new Struct([]))]
        await spentChallengeValidator.validateSpentChallenge(inputs, challengeInputs, witness)
    })

    describe('failed', () => {
      it('token must be same', async () => {
        await mockCompiledPredicate.setDicideReturn(true)
        const statusUpdate = support.ownershipStateUpdate(
          Address.from(ALICE_ADDRESS),
          1000000,
          0,
          5
        )

        const inputs = [EthCoder.encode(toStateUpdateStruct(statusUpdate))]
        const transaction = support.ownershipTransaction(
            Address.from(BOB_ADDRESS),
            1000000,
            0,
            5,
            Address.from(mockCompiledPredicate.address)
          )
        const challengeInputs = [EthCoder.encode(toTransactionStruct(transaction))]
        const witness = [EthCoder.encode(new Struct([]))]
        await expect(
          spentChallengeValidator.validateSpentChallenge(inputs, challengeInputs, witness)
        ).to.be.reverted
      })
      it('range must contain subrange', async () => {
        await mockCompiledPredicate.setDicideReturn(true)
        const statusUpdate = support.ownershipStateUpdate(
          Address.from(ALICE_ADDRESS),
          1000000,
          0,
          5
        )

        const inputs = [EthCoder.encode(toStateUpdateStruct(statusUpdate))]
        const transaction = support.ownershipTransaction(
            Address.from(ALICE_ADDRESS),
            1000000,
            1,
            5,
            Address.from(mockCompiledPredicate.address)
          )
        const challengeInputs = [EthCoder.encode(toTransactionStruct(transaction))]
        const witness = [EthCoder.encode(new Struct([]))]
        await expect(
          spentChallengeValidator.validateSpentChallenge(inputs, challengeInputs, witness)
        ).to.be.reverted
      })
      it('State object decided to false', async () => {
        await mockCompiledPredicate.setDicideReturn(false)
        const statusUpdate = support.ownershipStateUpdate(
          Address.from(ALICE_ADDRESS),
          1000000,
          0,
          5
        )

        const inputs = [EthCoder.encode(toStateUpdateStruct(statusUpdate))]
        const transaction = support.ownershipTransaction(
            Address.from(ALICE_ADDRESS),
            1000000,
            0,
            5,
            Address.from(mockCompiledPredicate.address)
          )
        const challengeInputs = [EthCoder.encode(toTransactionStruct(transaction))]
        const witness = [EthCoder.encode(new Struct([]))]
        await expect(
          spentChallengeValidator.validateSpentChallenge(inputs, challengeInputs, witness)
        ).to.be.reverted
      })
    })
  })

})
