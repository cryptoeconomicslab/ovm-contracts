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
import * as SpentChallengeValidator from '../../build/contracts/SpentChallengeValidator.json'
import * as ethers from 'ethers'
import {
  Address,
  Bytes,
  BigNumber,
} from '@cryptoeconomicslab/primitives'
import EthCoder from '@cryptoeconomicslab/eth-coder'
import { setupContext } from '@cryptoeconomicslab/context'
import {DisputeTestSupport, generateTree, encodeStructable, toStateUpdateStruct, toTransactionStruct} from './utils'
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
  let deserializer: ethers.Contract
  let spentChallengeValidator: ethers.Contract
  let disputeManager: ethers.Contract
  let exitDispute: ethers.Contract
  let commitment: ethers.Contract
  let commitmentVerifier: ethers.Contract

  before(async () => {
    deserializer = await deployContract(wallet, Deserializer, [])
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
    const init = async (): Promise<[Bytes[], Bytes[], Bytes[]]> => {
        const nextBlockNumber = 1000000
        const firstBlockInfo = support.prepareBlock(ALICE_ADDRESS, nextBlockNumber)
        const secondBlockInfo = support.prepareBlock(BOB_ADDRESS, nextBlockNumber + 1)
        const inputs = [EthCoder.encode(toStateUpdateStruct(secondBlockInfo.stateUpdate))]

        const transaction = support.ownershipTransaction(
            Address.from(ALICE_ADDRESS),
            1000000,
            0,
            5
          )
        const challengeInputs = [EthCoder.encode(toTransactionStruct(transaction))]
        const challengeWitness = [
          encodeStructable(firstBlockInfo.inclusionProof)
        ]
        return [inputs, challengeInputs, challengeWitness]
      }
    it.only('succeed', async () => {
        const [inputs, challengeInputs, witness] = await init()
        await spentChallengeValidator.validateSpentChallenge(inputs, challengeInputs, witness)
    })

    describe('failed', () => {
      it('token must be same', async () => {})
      it('range must contain subrange', async () => {})
      it('State object decided to false', async () => {})
    })
  })

})
