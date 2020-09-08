import chai from 'chai'
import {
  createMockProvider,
  deployContract,
  getWallets,
  solidity
} from 'ethereum-waffle'
import * as Utils from '../../build/contracts/Utils.json'
import * as Commitment from '../../build/contracts/Commitment.json'
import * as CommitmentVerifier from '../../build/contracts/CommitmentVerifier.json'
import * as MockCompiledPredicate from '../../build/contracts/MockCompiledPredicate.json'
import * as DisputeManager from '../../build/contracts/DisputeManager.json'
import * as BatchExitDispute from '../../build/contracts/BatchExitDispute.json'
import * as MockDepositContract from '../../build/contracts/MockDepositContract.json'
import * as MockToken from '../../build/contracts/MockToken.json'
import * as ethers from 'ethers'
import { Address, Bytes, Integer } from '@cryptoeconomicslab/primitives'
import EthCoder from '@cryptoeconomicslab/eth-coder'
import { setupContext } from '@cryptoeconomicslab/context'
import {
  DisputeTestSupport,
  generateTree,
  encodeStructable,
  toStateUpdateStruct,
  toTransactionStruct,
  toExitStruct
} from './utils'
import { StateUpdate, Transaction } from '@cryptoeconomicslab/plasma'
import { increaseBlocks } from '../helpers/increaseBlocks'
import { getTransactionEvents } from '../helpers/getTransactionEvent'
import { linkDeserializer } from '../helpers/link'
setupContext({ coder: EthCoder })

chai.use(solidity)
chai.use(require('chai-as-promised'))
const { expect, assert } = chai

const TOKEN_ADDRESS2 = Address.from(
  '0x0472ec0185ebb8202f3d4ddb0226998889663cf2'
)

describe('BatchExitDispute', () => {
  const provider = createMockProvider()
  const wallets = getWallets(provider)
  const wallet = wallets[0]
  const ALICE_ADDRESS = wallets[1].address
  const BOB_ADDRESS = wallets[2].address
  const support = new DisputeTestSupport(wallet)
  let utils: ethers.Contract
  let disputeManager: ethers.Contract
  let batchExitDispute: ethers.Contract
  let commitment: ethers.Contract
  let commitmentVerifier: ethers.Contract
  let mockCompiledPredicate: ethers.Contract

  before(async () => {
    utils = await deployContract(wallet, Utils, [])
    await linkDeserializer(wallet)
    await support.setup()
    mockCompiledPredicate = await deployContract(
      wallet,
      MockCompiledPredicate,
      []
    )
  })

  beforeEach(async () => {
    commitment = await deployContract(wallet, Commitment, [wallet.address])
    commitmentVerifier = await deployContract(wallet, CommitmentVerifier, [
      commitment.address
    ])
    disputeManager = await deployContract(wallet, DisputeManager, [
      utils.address
    ])
    batchExitDispute = await deployContract(
      wallet,
      BatchExitDispute,
      [disputeManager.address, commitmentVerifier.address, utils.address],
      {
        gasLimit: 6000000
      }
    )
  })

  describe('BatchExit Checkpoint', () => {
    let depositContract: ethers.Contract
    beforeEach(async () => {
      const token = await deployContract(wallet, MockToken, [])
      depositContract = await deployContract(wallet, MockDepositContract, [
        token.address
      ])
    })
    describe('claim', () => {
      it('succeed to claim batch exits contains a exit checkpoint', async () => {
        const currentBlockNumber = await commitment.currentBlock()
        const nextBlockNumber = currentBlockNumber + 1

        const su1 = support.ownershipStateUpdate(
          Address.from(ALICE_ADDRESS),
          nextBlockNumber,
          0,
          5
        )
        const su2 = support.ownershipStateUpdate(
          Address.from(ALICE_ADDRESS),
          nextBlockNumber,
          10,
          12
        )
        su1.update({
          depositContractAddress: Address.from(depositContract.address)
        })
        su2.update({
          depositContractAddress: Address.from(depositContract.address)
        })
        const inputs = [
          EthCoder.encode(toExitStruct(true, su1, su1.range)),
          EthCoder.encode(toExitStruct(true, su2, su2.range))
        ]
        const witness: Bytes[] = [Bytes.default(), Bytes.default()]

        await expect(
          batchExitDispute.claim(inputs, witness, { gasLimit: 800000 })
        ).to.emit(batchExitDispute, 'BatchExitClaimed')
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

        await expect(
          batchExitDispute.claim(inputs, witness, { gasLimit: 800000 })
        ).to.be.reverted
      })
    })
  })

  describe('Exit state update', () => {
    describe('claim', () => {
      describe('succeed to claim a exit stateUpdate', () => {
        it('create a new exit claim', async () => {
          const currentBlockNumber = await commitment.currentBlock()
          const nextBlockNumber1 = currentBlockNumber + 1
          const nextBlockNumber2 = currentBlockNumber + 2

          const stateUpdate1 = support.ownershipStateUpdate(
            Address.from(ALICE_ADDRESS),
            nextBlockNumber1,
            0,
            5
          )
          const stateUpdate2 = support.ownershipStateUpdate(
            Address.from(ALICE_ADDRESS),
            nextBlockNumber2,
            10,
            12
          )
          const tree1 = generateTree(stateUpdate1)
          const tree2 = generateTree(stateUpdate2)
          await commitment.submitRoot(nextBlockNumber1, tree1.root)
          await commitment.submitRoot(nextBlockNumber2, tree2.root)

          const inputs = [
            EthCoder.encode(
              toExitStruct(false, stateUpdate1, stateUpdate1.range)
            ),
            EthCoder.encode(
              toExitStruct(false, stateUpdate2, stateUpdate2.range)
            )
          ]
          const witness = [
            encodeStructable(tree1.inclusionProof),
            encodeStructable(tree2.inclusionProof)
          ]

          await expect(
            batchExitDispute.claim(inputs, witness, {
              gasLimit: 800000
            })
          ).to.emit(batchExitDispute, 'BatchExitClaimed')
        })
      })

      describe('fail to claim a exit stateUpdate', () => {
        it('cannot decode stateUpdate', async () => {
          const inputs = ['0x01']
          await expect(
            batchExitDispute.claim(inputs, [], {
              gasLimit: 800000
            })
          ).to.be.reverted
        })
      })
    })

    describe('challenge', () => {
      const init = async (
        challengeType = 'BATCH_EXIT_SPENT_CHALLENGE',
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

        const thirdSU = support.ownershipStateUpdate(
          Address.from(BOB_ADDRESS),
          nextBlockNumber + 2,
          10,
          12
        )
        const thridTree = generateTree(thirdSU)
        await commitment.submitRoot(nextBlockNumber + 2, thridTree.root)

        const inputs = [
          EthCoder.encode(
            toExitStruct(
              false,
              secondBlockInfo.stateUpdate,
              secondBlockInfo.stateUpdate.range
            )
          ),
          EthCoder.encode(toExitStruct(false, thirdSU, thirdSU.range))
        ]
        const witness = [
          encodeStructable(secondBlockInfo.inclusionProof),
          encodeStructable(thridTree.inclusionProof)
        ]
        await batchExitDispute.claim(inputs, witness, {
          gasLimit: 800000
        })
        // prepare challenge
        const challengeInputs = [
          Bytes.fromString(challengeType),
          EthCoder.encode(Integer.from(0))
        ]
        const challengeWitness = []
        if (challengeType === 'BATCH_EXIT_SPENT_CHALLENGE') {
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
        } else if (challengeType === 'BATCH_EXIT_CHECKPOINT_CHALLENGE') {
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
          ] = await init('BATCH_EXIT_SPENT_CHALLENGE', { transaction })
          await expect(
            batchExitDispute.challenge(
              inputs,
              challengeInputs,
              challengeWitness,
              {
                gasLimit: 900000
              }
            )
          ).to.emit(batchExitDispute, 'ExitSpentChallenged')
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
          ] = await init('BATCH_EXIT_SPENT_CHALLENGE', { transaction })
          await expect(
            batchExitDispute.challenge(
              inputs,
              challengeInputs,
              challengeWitness,
              {
                gasLimit: 900000
              }
            )
          ).to.emit(batchExitDispute, 'ExitSpentChallenged')
        }).timeout(15000)

        it('create a new exit challenge(checkpoint)', async () => {
          const [inputs, challengeInputs, challengeWitness] = await init(
            'BATCH_EXIT_CHECKPOINT_CHALLENGE'
          )
          await expect(
            batchExitDispute.challenge(
              inputs,
              challengeInputs,
              challengeWitness,
              {
                gasLimit: 800000
              }
            )
          ).to.emit(batchExitDispute, 'ExitCheckpointChallenged')
        }).timeout(15000)
      })
      describe('fail to challenge an exit', () => {
        it('If the first argument length is not 1, an error occurs.', async () => {
          const [, challengeInputs, challengeWitness] = await init()
          await expect(
            batchExitDispute.challenge([], challengeInputs, challengeWitness, {
              gasLimit: 800000
            })
          ).to.be.reverted
        })

        it('If the second argument is an empty array, an error occurs', async () => {
          const [inputs, , challengeWitness] = await init()
          await expect(
            batchExitDispute.challenge(inputs, [], challengeWitness, {
              gasLimit: 800000
            })
          ).to.be.reverted
        })

        it('If the third argument length is not 1, an error occurs. ', async () => {
          const [inputs, challengeInputs] = await init()
          await expect(
            batchExitDispute.challenge(inputs, challengeInputs, [], {
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
            batchExitDispute.challenge(
              inputs,
              challengeInputs,
              challengeWitness,
              {
                gasLimit: 900000
              }
            )
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
            batchExitDispute.challenge(
              inputs,
              challengeInputs,
              challengeWitness,
              {
                gasLimit: 900000
              }
            )
          ).to.be.reverted
        })
      })
    })

    describe('settle', () => {
      let inputs: Bytes[] = []
      let stateUpdate: StateUpdate
      let batchExitId: string
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

        inputs = [
          EthCoder.encode(toExitStruct(false, stateUpdate, stateUpdate.range))
        ]
        const witness = [encodeStructable(inclusionProof)]
        const claimTx = await batchExitDispute.claim(inputs, witness, {
          gasLimit: 800000
        })
        const events = await getTransactionEvents(
          provider,
          claimTx,
          batchExitDispute
        )
        batchExitId = events[1].values[0]
      })

      it('settle exit', async () => {
        await increaseBlocks(wallets, 10)

        const isCompletable = await batchExitDispute.isCompletable(batchExitId)
        assert.equal(isCompletable, true)

        await expect(batchExitDispute.settle(inputs)).to.emit(
          batchExitDispute,
          'BatchExitSettled'
        )
      })

      it('cannot settle exit', async () => {
        const isCompletable = await batchExitDispute.isCompletable(batchExitId)
        assert.equal(isCompletable, false)

        await expect(batchExitDispute.settle(inputs)).revertedWith(
          'revert dispute period has not been passed'
        )
      })
    })
  })
})
