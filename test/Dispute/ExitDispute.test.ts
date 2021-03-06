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
import * as MockCompiledPredicate from '../../build/contracts/MockCompiledPredicate.json'
import * as DisputeManager from '../../build/contracts/DisputeManager.json'
import * as ExitDispute from '../../build/contracts/ExitDispute.json'
import * as MockDepositContract from '../../build/contracts/MockDepositContract.json'
import * as MockToken from '../../build/contracts/MockToken.json'
import * as ethers from 'ethers'
import { Address, Bytes } from '@cryptoeconomicslab/primitives'
import EthCoder from '@cryptoeconomicslab/eth-coder'
import { setupContext } from '@cryptoeconomicslab/context'
import {
  DisputeTestSupport,
  generateTree,
  encodeStructable,
  toStateUpdateStruct,
  toTransactionStruct,
  stateUpdateToLog
} from './utils'
import { StateUpdate, Transaction } from '@cryptoeconomicslab/plasma'
import { increaseBlocks } from '../helpers/increaseBlocks'
import { keccak256 } from 'ethers/utils'
setupContext({ coder: EthCoder })

chai.use(solidity)
chai.use(require('chai-as-promised'))
const { expect, assert } = chai

const TOKEN_ADDRESS2 = Address.from(
  '0x0472ec0185ebb8202f3d4ddb0226998889663cf2'
)

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
  let mockCompiledPredicate: ethers.Contract
  let spentChallengeValidator: ethers.Contract

  before(async () => {
    utils = await deployContract(wallet, Utils, [])
    deserializer = await deployContract(wallet, Deserializer, [])
    await support.setup()
    mockCompiledPredicate = await deployContract(
      wallet,
      MockCompiledPredicate,
      []
    )
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
    //spentChallengeValidator = await deployContract(wallet, SpentChallengeValidator, [])
    exitDispute = await deployContract(
      wallet,
      ExitDispute,
      [disputeManager.address, commitmentVerifier.address, utils.address],
      {
        gasLimit: 6000000
      }
    )
  })

  describe('Exit Checkpoint', () => {
    let depositContract: ethers.Contract
    beforeEach(async () => {
      const token = await deployContract(wallet, MockToken, [])
      depositContract = await deployContract(wallet, MockDepositContract, [
        token.address
      ])
    })
    describe('claim', () => {
      it('succeed to claim a exit checkpoint', async () => {
        const currentBlockNumber = await commitment.currentBlock()
        const nextBlockNumber = currentBlockNumber + 1

        const su = support.ownershipStateUpdate(
          Address.from(ALICE_ADDRESS),
          nextBlockNumber,
          0,
          5
        )
        su.update({
          depositContractAddress: Address.from(depositContract.address)
        })
        const id = keccak256('0x01')
        const inputs = [
          EthCoder.encode(toStateUpdateStruct(su)),
          EthCoder.encode(toStateUpdateStruct(su))
        ]
        const witness: Bytes[] = []

        await expect(
          exitDispute.claim(inputs, witness, { gasLimit: 800000 })
        ).to.emit(exitDispute, 'ExitClaimed')
      })

      it('fail to claim a exit checkpoint checkpoint is not finalized at stateUpdate', async () => {
        await depositContract.setCheckpoints(false, { gasLimit: 100000 })
        const currentBlockNumber = await commitment.currentBlock()
        const nextBlockNumber = currentBlockNumber + 1

        const su = support.ownershipStateUpdate(
          Address.from(ALICE_ADDRESS),
          nextBlockNumber,
          0,
          5
        )
        su.update({
          depositContractAddress: Address.from(depositContract.address)
        })
        const inputs = [EthCoder.encode(toStateUpdateStruct(su))]
        const witness: Bytes[] = []

        await expect(exitDispute.claim(inputs, witness, { gasLimit: 800000 }))
          .to.be.reverted
      })
    })
  })

  describe('Exit state update', () => {
    describe('claim', () => {
      describe('succeed to claim a exit stateUpdate', () => {
        it('create a new exit claim', async () => {
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

          const inputs = [EthCoder.encode(toStateUpdateStruct(stateUpdate))]
          const witness = [encodeStructable(inclusionProof)]

          await expect(
            exitDispute.claim(inputs, witness, {
              gasLimit: 800000
            })
          ).to.emit(exitDispute, 'ExitClaimed')
        })
      })

      describe('fail to claim a exit stateUpdate', () => {
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

          const inputs = [EthCoder.encode(toStateUpdateStruct(stateUpdate))]
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

          const inputs = [EthCoder.encode(toStateUpdateStruct(stateUpdate))]
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
      // FIXME: refactor later
      const init = async (
        challengeType = 'EXIT_SPENT_CHALLENGE',
        options: {
          transaction?: Transaction
        } = {}
      ): Promise<[Bytes[], Bytes[], Bytes[]]> => {
        const currentBlockNumber = await commitment.currentBlock()
        const nextBlockNumber = currentBlockNumber.toNumber() + 1
        const firstBlockInfo = support.prepareBlock(
          ALICE_ADDRESS,
          nextBlockNumber
        )
        await commitment.submitRoot(nextBlockNumber, firstBlockInfo.root)

        const secondBlockInfo = support.prepareBlock(
          BOB_ADDRESS,
          nextBlockNumber + 1
        )
        await commitment.submitRoot(nextBlockNumber + 1, secondBlockInfo.root)

        const inputs = [
          EthCoder.encode(toStateUpdateStruct(secondBlockInfo.stateUpdate))
        ]
        const witness = [encodeStructable(secondBlockInfo.inclusionProof)]
        await exitDispute.claim(inputs, witness, {
          gasLimit: 800000
        })
        // prepare challenge
        const challengeInputs = [Bytes.fromString(challengeType)]
        const challengeWitness = []
        if (challengeType === 'EXIT_SPENT_CHALLENGE') {
          if (!options.transaction) {
            options.transaction = support.ownershipTransaction(
              Address.from(BOB_ADDRESS),
              1000000,
              0,
              5,
              Address.from(mockCompiledPredicate.address)
            )
          }
          const signature = '0x00112233445566778899'
          challengeInputs.push(
            EthCoder.encode(toTransactionStruct(options.transaction))
          )
          challengeWitness.push(Bytes.fromHexString(signature))
        } else if (challengeType === 'EXIT_CHECKPOINT_CHALLENGE') {
          challengeInputs.push(
            EthCoder.encode(toStateUpdateStruct(firstBlockInfo.stateUpdate))
          )
          challengeWitness.push(encodeStructable(firstBlockInfo.inclusionProof))
        } else {
          throw new Error('invalid challenge type')
        }
        return [inputs, challengeInputs, challengeWitness]
      }
      describe('succeed to exit challenge', () => {
        it('create a new exit challenge(spent) with small amount tx', async () => {
          const transaction = support.ownershipTransaction(
            Address.from(BOB_ADDRESS),
            1000000,
            0,
            2,
            Address.from(mockCompiledPredicate.address)
          )
          const [
            inputs,
            challengeInputs,
            challengeWitness
          ] = await init('EXIT_SPENT_CHALLENGE', { transaction })
          await expect(
            exitDispute.challenge(inputs, challengeInputs, challengeWitness, {
              gasLimit: 900000
            })
          ).to.emit(exitDispute, 'ExitSpentChallenged')
        }).timeout(15000)

        it('create a new exit challenge(spent) with merge tx', async () => {
          const transaction = support.ownershipTransaction(
            Address.from(BOB_ADDRESS),
            1000000,
            0,
            10,
            Address.from(mockCompiledPredicate.address)
          )
          const [
            inputs,
            challengeInputs,
            challengeWitness
          ] = await init('EXIT_SPENT_CHALLENGE', { transaction })
          await expect(
            exitDispute.challenge(inputs, challengeInputs, challengeWitness, {
              gasLimit: 900000
            })
          ).to.emit(exitDispute, 'ExitSpentChallenged')
        }).timeout(15000)

        it('create a new exit challenge(checkpoint)', async () => {
          const [inputs, challengeInputs, challengeWitness] = await init(
            'EXIT_CHECKPOINT_CHALLENGE'
          )
          await expect(
            exitDispute.challenge(inputs, challengeInputs, challengeWitness, {
              gasLimit: 800000
            })
          ).to.emit(exitDispute, 'ExitCheckpointChallenged')
        }).timeout(15000)
      })
      describe('fail to challenge an exit', () => {
        it('If the first argument length is not 1, an error occurs.', async () => {
          const [, challengeInputs, challengeWitness] = await init()
          await expect(
            exitDispute.challenge([], challengeInputs, challengeWitness, {
              gasLimit: 800000
            })
          ).to.be.reverted
        })

        it('If the second argument is an empty array, an error occurs', async () => {
          const [inputs, , challengeWitness] = await init()
          await expect(
            exitDispute.challenge(inputs, [], challengeWitness, {
              gasLimit: 800000
            })
          ).to.be.reverted
        })

        it('If the third argument length is not 1, an error occurs. ', async () => {
          const [inputs, challengeInputs] = await init()
          await expect(
            exitDispute.challenge(inputs, challengeInputs, [], {
              gasLimit: 800000
            })
          ).to.be.reverted
        })

        it('token must be same', async () => {
          const [inputs, challengeInputs, challengeWitness] = await init()
          const transaction = support.ownershipTransaction(
            Address.from(BOB_ADDRESS),
            1000000,
            0,
            5,
            Address.from(mockCompiledPredicate.address),
            false,
            TOKEN_ADDRESS2
          )
          challengeInputs.push(
            EthCoder.encode(toTransactionStruct(transaction))
          )
          await expect(
            exitDispute.challenge(inputs, challengeInputs, challengeWitness, {
              gasLimit: 900000
            })
          ).to.be.reverted
        })

        it('range must contain subrange', async () => {
          const [inputs, challengeInputs, challengeWitness] = await init()
          const transaction = support.ownershipTransaction(
            Address.from(BOB_ADDRESS),
            1000000,
            1,
            100,
            Address.from(mockCompiledPredicate.address)
          )
          challengeInputs.push(
            EthCoder.encode(toTransactionStruct(transaction))
          )
          await expect(
            exitDispute.challenge(inputs, challengeInputs, challengeWitness, {
              gasLimit: 900000
            })
          ).to.be.reverted
        })

        it.skip('State object decided to false', async () => {
          const [inputs, challengeInputs, challengeWitness] = await init(
            'EXIT_SPENT_CHALLENGE'
          )
          const transaction = support.ownershipTransaction(
            Address.from(BOB_ADDRESS),
            1000000,
            0,
            5,
            Address.from(mockCompiledPredicate.address)
          )
          challengeInputs.push(
            EthCoder.encode(toTransactionStruct(transaction))
          )
          await expect(
            exitDispute.challenge(inputs, challengeInputs, challengeWitness, {
              gasLimit: 900000
            })
          ).to.be.revertedWith('State object decided to false')
        })
      })
    })

    describe('settle', () => {
      let inputs: Bytes[] = []
      let stateUpdate: StateUpdate
      beforeEach(async () => {
        const currentBlockNumber = await commitment.currentBlock()
        const nextBlockNumber = currentBlockNumber + 1

        stateUpdate = support.ownershipStateUpdate(
          Address.from(ALICE_ADDRESS),
          nextBlockNumber,
          0,
          5
        )
        const { root, inclusionProof } = generateTree(stateUpdate)
        await commitment.submitRoot(nextBlockNumber, root)

        inputs = [EthCoder.encode(toStateUpdateStruct(stateUpdate))]
        const witness = [encodeStructable(inclusionProof)]

        await exitDispute.claim(inputs, witness, {
          gasLimit: 800000
        })
      })

      it('settle exit', async () => {
        await increaseBlocks(wallets, 10)

        await expect(exitDispute.settle(inputs)).to.emit(
          exitDispute,
          'ExitSettled'
        )
      })

      it('cannot settle exit', async () => {
        await expect(exitDispute.settle(inputs)).revertedWith(
          'revert dispute period has not been passed'
        )
      })
    })

    describe('isCompletable', () => {
      it('returns false', async () => {
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

        const inputs = [EthCoder.encode(toStateUpdateStruct(stateUpdate))]
        const witness = [encodeStructable(inclusionProof)]

        await exitDispute.claim(inputs, witness, {
          gasLimit: 800000
        })
        const isCompletable = await exitDispute.isCompletable(
          stateUpdateToLog(stateUpdate)
        )
        assert.equal(isCompletable, false)
      })
    })
  })
})
