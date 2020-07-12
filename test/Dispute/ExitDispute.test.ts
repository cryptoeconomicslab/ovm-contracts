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
import * as ethers from 'ethers'
import {
  Address,
  Bytes,
} from '@cryptoeconomicslab/primitives'
import EthCoder from '@cryptoeconomicslab/eth-coder'
import { setupContext } from '@cryptoeconomicslab/context'
import {DisputeTestSupport, generateTree, encodeStructable} from './utils'
setupContext({ coder: EthCoder })

chai.use(solidity)
chai.use(require('chai-as-promised'))
const { expect, assert } = chai



describe('ExitDispute', () => {
  const provider = createMockProvider()
  const wallets = getWallets(provider)
  const wallet = wallets[0]
  const ALICE_ADDRESS = wallets[1].address
  const BOB_ADDRESS = wallets[2].address
  const support = new DisputeTestSupport(wallet)
  let deserializer: ethers.Contract
  let utils: ethers.Contract
  let disputeManager: ethers.Contract
  let exitDispute: ethers.Contract
  let commitment: ethers.Contract
  let commitmentVerifier: ethers.Contract

  before(async () => {
    utils = await deployContract(wallet, Utils, [])
    deserializer = await deployContract(wallet, Deserializer, [])
    await support.setup()
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
    commitment = await deployContract(wallet, Commitment, [wallet.address])
    commitmentVerifier = await deployContract(wallet, CommitmentVerifier, [
      commitment.address
    ])
    disputeManager = await deployContract(wallet, DisputeManager, [
      utils.address
    ])
    exitDispute = await deployContract(wallet, ExitDispute, [
      disputeManager.address,
      commitmentVerifier.address,
      utils.address
    ])

  })


  describe('claim', () => {
    describe('succeed to claim a checkpoint', () => {
      it('create a new checkpoint claim', async () => {
        const currentBlockNumber = await commitment.currentBlock()
        const nextBlockNumber = currentBlockNumber + 1

        const stateUpdate = support.ownershipStateUpdate(
          Address.from(ALICE_ADDRESS),
          nextBlockNumber,
          0,
          5
        )
        const { root, inclusionProof } = generateTree(stateUpdate)
        await commitment.submitRoot(nextBlockNumber, root)

        const inputs = [encodeStructable(stateUpdate.property)]
        const witness = [encodeStructable(inclusionProof)]

        await expect(
          exitDispute.claim(inputs, witness, {
            gasLimit: 800000
          })
        ).to.emit(exitDispute, 'ExitClaimed')
      })
    })

    describe('fail to claim a checkpoint', () => {
      it('cannot decode stateUpdate', async () => {
        const inputs = ['0x01']
        await expect(
          exitDispute.claim(inputs, [], {
            gasLimit: 800000
          })
        ).to.be.reverted
      })

      it('cannot decode inclusionProof', async () => {
        const currentBlockNumber = await commitment.currentBlock()
        const nextBlockNumber = currentBlockNumber + 1

        const stateUpdate = support.ownershipStateUpdate(
          Address.from(ALICE_ADDRESS),
          nextBlockNumber,
          0,
          5
        )
        const { root } = generateTree(stateUpdate)
        await commitment.submitRoot(nextBlockNumber, root)

        const inputs = [encodeStructable(stateUpdate.property)]
        const witness = ['0x01']

        await expect(
          exitDispute.claim(inputs, witness, {
            gasLimit: 800000
          })
        ).to.be.reverted
      })

      it('falsy inclusionProof', async () => {
        const currentBlockNumber = await commitment.currentBlock()
        const nextBlockNumber = currentBlockNumber + 1

        const stateUpdate = support.ownershipStateUpdate(
          Address.from(ALICE_ADDRESS),
          nextBlockNumber,
          0,
          5
        )
        const { root, falsyInclusionProof } = generateTree(stateUpdate)
        await commitment.submitRoot(nextBlockNumber, root)

        const inputs = [encodeStructable(stateUpdate.property)]
        const witness = [encodeStructable(falsyInclusionProof)]

        await expect(
          exitDispute.claim(inputs, witness, {
            gasLimit: 800000
          })
        ).to.be.reverted
      })
    })
  })

  describe('challenge', () => {
    const init = async (): Promise<[Bytes[], Bytes[], Bytes[]]> => {
      const currentBlockNumber = await commitment.currentBlock()
      const nextBlockNumber = currentBlockNumber.toNumber() + 1
      const firstBlockInfo = support.prepareBlock(ALICE_ADDRESS, nextBlockNumber)
      await commitment.submitRoot(nextBlockNumber, firstBlockInfo.root)

      const secondBlockInfo = support.prepareBlock(BOB_ADDRESS, nextBlockNumber + 1)
      await commitment.submitRoot(nextBlockNumber + 1, secondBlockInfo.root)

      const inputs = [encodeStructable(secondBlockInfo.stateUpdate.property)]
      const witness = [encodeStructable(secondBlockInfo.inclusionProof)]

      await exitDispute.claim(inputs, witness, {
        gasLimit: 800000
      })

      // prepare challenge
      const challengeInputs = [
        Bytes.fromString('EXIT_SPENT_CHALLENGE')
      ]
      const challengeWitness = [
        encodeStructable(firstBlockInfo.inclusionProof)
      ]
      return [inputs, challengeInputs, challengeWitness]
    }
    describe('succeed to exit challenge', () => {
      it('create a new exit challenge', async () => {
        const [inputs, challengeInputs, challengeWitness] = await init()
        await expect(
          exitDispute.challenge(
            inputs,
            challengeInputs,
            challengeWitness,
            {
              gasLimit: 800000
            }
          )
        ).to.emit(exitDispute, 'ExitChallenged')
      }).timeout(15000)
    })
    describe('failer to exit challenge', () => {
      it('check ', async () => {
        const [, challengeInputs, challengeWitness] = await init()
        await expect(
          exitDispute.challenge(
            [],
            challengeInputs,
            challengeWitness,
            {
              gasLimit: 800000
            }
          )
        ).to.be.reverted
      })
      it('check ', async () => {
        const [inputs, , challengeWitness] = await init()
        await expect(
          exitDispute.challenge(
            inputs,
            [],
            challengeWitness,
            {
              gasLimit: 800000
            }
          )
        ).to.be.reverted
      })
      it('check ', async () => {
        const [inputs, challengeInputs, ] = await init()
        await expect(
          exitDispute.challenge(
            inputs,
            challengeInputs,
            [],
            {
              gasLimit: 800000
            }
          )
        ).to.be.reverted
      })
    })
  })
  
  describe.skip('removeChallenge', () => {
    // not implemented
  })

  describe.skip('settle', () => {

  })
})
