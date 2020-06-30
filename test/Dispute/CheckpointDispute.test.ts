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
import * as CheckpointDispute from '../../build/contracts/CheckpointDispute.json'
import * as MockCompiledPredicate from '../../build/contracts/MockCompiledPredicate.json'
import * as MockFalsyCompiledPredicate from '../../build/contracts/MockFalsyCompiledPredicate.json'
import * as ethers from 'ethers'
import { Keccak256 } from '@cryptoeconomicslab/hash'
import {
  Address,
  BigNumber,
  Bytes,
  FixedBytes,
  Range,
  Struct
} from '@cryptoeconomicslab/primitives'
import {
  DoubleLayerTree,
  DoubleLayerTreeLeaf
} from '@cryptoeconomicslab/merkle-tree'
import { StateUpdate } from '@cryptoeconomicslab/plasma'
import { Property } from '@cryptoeconomicslab/ovm'
import EthCoder from '@cryptoeconomicslab/eth-coder'
import { setupContext } from '@cryptoeconomicslab/context'
setupContext({ coder: EthCoder })

chai.use(solidity)
chai.use(require('chai-as-promised'))
const { expect, assert } = chai

// generate merkle tree.
// returns its root and encoded inclusionProof of given state update.
function generateTree(
  stateUpdate: StateUpdate,
  falsyStateUpdate?: StateUpdate
) {
  function generateDoubleLayerTreeLeaf(
    address: Address,
    bn: number,
    data: string
  ) {
    return new DoubleLayerTreeLeaf(
      address,
      BigNumber.from(bn),
      FixedBytes.from(32, Keccak256.hash(Bytes.fromString(data)).data)
    )
  }
  const tokenAddress = Address.default()

  // leaf0 : include given state object
  const leaf0 = new DoubleLayerTreeLeaf(
    stateUpdate.depositContractAddress,
    stateUpdate.range.start,
    FixedBytes.from(
      32,
      Keccak256.hash(EthCoder.encode(stateUpdate.stateObject.toStruct())).data
    )
  )

  // random leaf for merkle tree
  const leaf1 = falsyStateUpdate
    ? new DoubleLayerTreeLeaf(
        falsyStateUpdate.depositContractAddress,
        falsyStateUpdate.range.start,
        FixedBytes.from(
          32,
          Keccak256.hash(
            EthCoder.encode(falsyStateUpdate.stateObject.toStruct())
          ).data
        )
      )
    : generateDoubleLayerTreeLeaf(tokenAddress, 7, 'leaf1')
  const leaf2 = generateDoubleLayerTreeLeaf(tokenAddress, 16, 'leaf2')
  const leaf3 = generateDoubleLayerTreeLeaf(tokenAddress, 100, 'leaf3')

  const tree = new DoubleLayerTree([leaf0, leaf1, leaf2, leaf3])

  return {
    root: tree.getRoot().toHexString(),
    inclusionProof: tree.getInclusionProofByAddressAndIndex(tokenAddress, 0),
    falsyInclusionProof: tree.getInclusionProofByAddressAndIndex(
      tokenAddress,
      1
    )
  }
}

function encodeStructable(structable: { toStruct: () => Struct }) {
  return EthCoder.encode(structable.toStruct())
}

describe('CheckpointDispute', () => {
  const provider = createMockProvider()
  const wallets = getWallets(provider)
  const wallet = wallets[0]
  const ALICE_ADDRESS = wallets[1].address
  const BOB_ADDRESS = wallets[2].address
  let utils: ethers.Contract,
    deserializer: ethers.Contract,
    disputeManager: ethers.Contract,
    checkpointDispute: ethers.Contract,
    commitment: ethers.Contract,
    commitmentVerifier: ethers.Contract,
    truthyCompiledPredicate: ethers.Contract,
    falsyCompiledPredicate: ethers.Contract

  before(async () => {
    utils = await deployContract(wallet, Utils, [])
    deserializer = await deployContract(wallet, Deserializer, [])

    // mock always decide to true
    truthyCompiledPredicate = await deployContract(
      wallet,
      MockCompiledPredicate,
      []
    )
    // mock always decide to false
    falsyCompiledPredicate = await deployContract(
      wallet,
      MockFalsyCompiledPredicate,
      []
    )
  })

  beforeEach(async () => {
    try {
      link(
        CheckpointDispute,
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
    checkpointDispute = await deployContract(wallet, CheckpointDispute, [
      disputeManager.address,
      commitmentVerifier.address,
      utils.address
    ])
  })

  function ownershipStateUpdate(
    owner: Address,
    blockNumber: number,
    start: number,
    end: number,
    falsy?: boolean
  ) {
    const predicate = falsy ? falsyCompiledPredicate : truthyCompiledPredicate
    return new StateUpdate(
      Address.default(),
      Address.default(),
      new Range(BigNumber.from(start), BigNumber.from(end)),
      BigNumber.from(blockNumber),
      new Property(Address.from(predicate.address), [EthCoder.encode(owner)])
    )
  }

  function prepareBlock(owner: string, blockNumber: number, falsy?: boolean) {
    const su = ownershipStateUpdate(
      Address.from(owner),
      blockNumber,
      0,
      5,
      falsy
    )
    const falsySU = ownershipStateUpdate(
      Address.from(owner),
      blockNumber,
      10,
      20
    )
    const tree = generateTree(su, falsySU)
    return {
      stateUpdate: su,
      falsySU,
      ...tree
    }
  }

  describe('claim', () => {
    describe('succeed to claim a checkpoint', () => {
      it('create a new checkpoint claim', async () => {
        const currentBlockNumber = await commitment.currentBlock()
        const nextBlockNumber = currentBlockNumber + 1

        const stateUpdate = ownershipStateUpdate(
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
          checkpointDispute.claim(inputs, witness, {
            gasLimit: 1200000
          })
        ).to.emit(checkpointDispute, 'CheckpointClaimed')
      })
    })

    describe('fail to claim a checkpoint', () => {
      it('cannot decode stateUpdate', async () => {
        const inputs = ['0x01']
        await expect(
          checkpointDispute.claim(inputs, [], {
            gasLimit: 1200000
          })
        ).to.be.reverted
      })

      it('cannot decode inclusionProof', async () => {
        const currentBlockNumber = await commitment.currentBlock()
        const nextBlockNumber = currentBlockNumber + 1

        const stateUpdate = ownershipStateUpdate(
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
          checkpointDispute.claim(inputs, witness, {
            gasLimit: 1200000
          })
        ).to.be.reverted
      })

      it('falsy inclusionProof', async () => {
        const currentBlockNumber = await commitment.currentBlock()
        const nextBlockNumber = currentBlockNumber + 1

        const stateUpdate = ownershipStateUpdate(
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
          checkpointDispute.claim(inputs, witness, {
            gasLimit: 1200000
          })
        ).to.be.reverted
      })
    })
  })

  describe('challenge', () => {
    describe('succeed to challeng echeckpoint', () => {
      it('succeed to challenge invalid history', async () => {
        // prepare blocks
        const currentBlockNumber = await commitment.currentBlock()
        const nextBlockNumber = currentBlockNumber.toNumber() + 1
        const firstBlockInfo = prepareBlock(ALICE_ADDRESS, nextBlockNumber)
        await commitment.submitRoot(nextBlockNumber, firstBlockInfo.root)

        const secondBlockInfo = prepareBlock(BOB_ADDRESS, nextBlockNumber + 1)
        await commitment.submitRoot(nextBlockNumber + 1, secondBlockInfo.root)

        const inputs = [encodeStructable(secondBlockInfo.stateUpdate.property)]
        const witness = [encodeStructable(secondBlockInfo.inclusionProof)]

        await checkpointDispute.claim(inputs, witness, {
          gasLimit: 1200000
        })

        // prepare challenge
        const challengeInputs = [
          encodeStructable(firstBlockInfo.stateUpdate.property)
        ]
        const challengeWitness = [
          encodeStructable(firstBlockInfo.inclusionProof)
        ]

        await expect(
          checkpointDispute.challenge(
            inputs,
            challengeInputs,
            challengeWitness,
            {
              gasLimit: 1200000
            }
          )
        ).to.emit(checkpointDispute, 'CheckpointChallenged')
      })
    })

    describe('fail to challenge', async () => {
      describe('input validation', () => {
        async function prepareInputs() {
          const currentBlockNumber = await commitment.currentBlock()
          const blockInfo = prepareBlock(
            ALICE_ADDRESS,
            currentBlockNumber.toNumber() + 1
          )
          const inputs = [encodeStructable(blockInfo.stateUpdate.property)]
          const challengeInputs = [
            encodeStructable(blockInfo.stateUpdate.property)
          ]
          const challengeWitness = [encodeStructable(blockInfo.inclusionProof)]
          return {
            inputs,
            challengeInputs,
            challengeWitness
          }
        }

        it('invalid inputs length', async () => {
          const {
            inputs,
            challengeInputs,
            challengeWitness
          } = await prepareInputs()
          await expect(
            checkpointDispute.challenge(
              [...inputs, ...inputs],
              challengeInputs,
              challengeWitness,
              {
                gasLimit: 120000
              }
            )
          ).to.be.reverted
        })

        it('invalid challengeInputs length', async () => {
          const {
            inputs,
            challengeInputs,
            challengeWitness
          } = await prepareInputs()
          await expect(
            checkpointDispute.challenge(
              inputs,
              [...challengeInputs, ...challengeInputs],
              challengeWitness,
              {
                gasLimit: 120000
              }
            )
          ).to.be.reverted
        })

        it('invalid challengeWitness length', async () => {
          const {
            inputs,
            challengeInputs,
            challengeWitness
          } = await prepareInputs()

          await expect(
            checkpointDispute.challenge(
              inputs,
              challengeInputs,
              [...challengeWitness, ...challengeWitness],
              {
                gasLimit: 1200000
              }
            )
          ).to.be.reverted
        })

        it('invalid inputs, stateUpdate bytes', async () => {
          const { challengeInputs, challengeWitness } = await prepareInputs()

          await expect(
            checkpointDispute.challenge(
              ['0x01'],
              challengeInputs,
              challengeWitness,
              {
                gasLimit: 1200000
              }
            )
          ).to.be.reverted
        })

        it('invalid challengeInputs, stateUpdate bytes', async () => {
          const { inputs, challengeWitness } = await prepareInputs()

          await expect(
            checkpointDispute.challenge(inputs, ['0x01'], challengeWitness, {
              gasLimit: 1200000
            })
          ).to.be.reverted
        })

        it('invalid witness, inclusionProof bytes', async () => {
          const { inputs, challengeInputs } = await prepareInputs()
          await expect(
            checkpointDispute.challenge(inputs, challengeInputs, ['0x01'], {
              gasLimit: 1200000
            })
          ).to.be.reverted
        })
      })

      describe('invalid inputs contents', () => {
        it('claim does not exists', async () => {
          // prepare blocks
          const currentBlockNumber = await commitment.currentBlock()
          const nextBlockNumber = currentBlockNumber.toNumber() + 1
          const firstBlockInfo = prepareBlock(ALICE_ADDRESS, nextBlockNumber)
          await commitment.submitRoot(nextBlockNumber, firstBlockInfo.root)

          const secondBlockInfo = prepareBlock(BOB_ADDRESS, nextBlockNumber + 1)
          await commitment.submitRoot(nextBlockNumber + 1, secondBlockInfo.root)

          const inputs = [
            encodeStructable(secondBlockInfo.stateUpdate.property)
          ]
          const challengeInputs = [
            encodeStructable(firstBlockInfo.stateUpdate.property)
          ]
          const challengeWitness = [
            encodeStructable(firstBlockInfo.inclusionProof)
          ]

          await expect(
            checkpointDispute.challenge(
              inputs,
              challengeInputs,
              challengeWitness,
              {
                gasLimit: 1200000
              }
            )
          ).to.revertedWith('Claim does not exist')
        })

        it('Falsy inclusion proof', async () => {
          // prepare blocks
          const currentBlockNumber = await commitment.currentBlock()
          const nextBlockNumber = currentBlockNumber.toNumber() + 1
          const firstBlockInfo = prepareBlock(ALICE_ADDRESS, nextBlockNumber)
          await commitment.submitRoot(nextBlockNumber, firstBlockInfo.root)

          const secondBlockInfo = prepareBlock(BOB_ADDRESS, nextBlockNumber + 1)
          await commitment.submitRoot(nextBlockNumber + 1, secondBlockInfo.root)

          const inputs = [
            encodeStructable(secondBlockInfo.stateUpdate.property)
          ]
          const witness = [encodeStructable(secondBlockInfo.inclusionProof)]

          await checkpointDispute.claim(inputs, witness, {
            gasLimit: 1200000
          })

          // prepare challenge
          const challengeInputs = [
            encodeStructable(firstBlockInfo.stateUpdate.property)
          ]
          const challengeWitness = [
            encodeStructable(firstBlockInfo.falsyInclusionProof)
          ]

          await expect(
            checkpointDispute.challenge(
              inputs,
              challengeInputs,
              challengeWitness,
              {
                gasLimit: 1200000
              }
            )
          ).to.be.reverted
        })

        it('block number is greater', async () => {
          // prepare blocks
          const currentBlockNumber = await commitment.currentBlock()
          const nextBlockNumber = currentBlockNumber.toNumber() + 1
          const firstBlockInfo = prepareBlock(ALICE_ADDRESS, nextBlockNumber)
          await commitment.submitRoot(nextBlockNumber, firstBlockInfo.root)

          const secondBlockInfo = prepareBlock(BOB_ADDRESS, nextBlockNumber + 1)
          await commitment.submitRoot(nextBlockNumber + 1, secondBlockInfo.root)

          const inputs = [encodeStructable(firstBlockInfo.stateUpdate.property)]
          const witness = [encodeStructable(firstBlockInfo.inclusionProof)]

          await checkpointDispute.claim(inputs, witness, {
            gasLimit: 1200000
          })

          // prepare challenge
          const challengeInputs = [
            encodeStructable(secondBlockInfo.stateUpdate.property)
          ]
          const challengeWitness = [
            encodeStructable(secondBlockInfo.falsyInclusionProof)
          ]

          await expect(
            checkpointDispute.challenge(
              inputs,
              challengeInputs,
              challengeWitness,
              {
                gasLimit: 1200000
              }
            )
          ).to.revertedWith('BlockNumber must be smaller than challenged state')
        })

        it('range is not subrange', async () => {
          // prepare blocks
          const currentBlockNumber = await commitment.currentBlock()
          const nextBlockNumber = currentBlockNumber.toNumber() + 1
          const firstBlockInfo = prepareBlock(ALICE_ADDRESS, nextBlockNumber)
          await commitment.submitRoot(nextBlockNumber, firstBlockInfo.root)

          const secondBlockInfo = prepareBlock(BOB_ADDRESS, nextBlockNumber + 1)
          await commitment.submitRoot(nextBlockNumber + 1, secondBlockInfo.root)

          const inputs = [
            encodeStructable(secondBlockInfo.stateUpdate.property)
          ]
          const witness = [encodeStructable(secondBlockInfo.inclusionProof)]

          await checkpointDispute.claim(inputs, witness, {
            gasLimit: 1200000
          })

          // prepare challenge
          const challengeInputs = [
            encodeStructable(firstBlockInfo.falsySU.property)
          ]
          const challengeWitness = [
            encodeStructable(firstBlockInfo.falsyInclusionProof)
          ]

          await expect(
            checkpointDispute.challenge(
              inputs,
              challengeInputs,
              challengeWitness,
              {
                gasLimit: 1200000
              }
            )
          ).to.revertedWith('Range must be subrange of stateUpdate')
        })

        it('deposit contract address is different', async () => {
          const currentBlockNumber = await commitment.currentBlock()
          const nextBlockNumber = currentBlockNumber.toNumber() + 1
          const firstBlockInfo = prepareBlock(ALICE_ADDRESS, nextBlockNumber)
          await commitment.submitRoot(nextBlockNumber, firstBlockInfo.root)

          const secondBlockInfo = prepareBlock(BOB_ADDRESS, nextBlockNumber + 1)
          await commitment.submitRoot(nextBlockNumber + 1, secondBlockInfo.root)

          const inputs = [
            encodeStructable(secondBlockInfo.stateUpdate.property)
          ]
          const witness = [encodeStructable(secondBlockInfo.inclusionProof)]

          await checkpointDispute.claim(inputs, witness, {
            gasLimit: 1200000
          })

          const suWithDifferentAddress = new StateUpdate(
            Address.default(),
            Address.from(ALICE_ADDRESS),
            new Range(BigNumber.from(0), BigNumber.from(5)),
            BigNumber.from(nextBlockNumber),
            new Property(Address.from(truthyCompiledPredicate.address), [
              EthCoder.encode(Address.from(ALICE_ADDRESS))
            ])
          )
          // prepare challenge
          const challengeInputs = [
            encodeStructable(suWithDifferentAddress.property)
          ]
          const challengeWitness = [
            encodeStructable(firstBlockInfo.falsyInclusionProof)
          ]

          await expect(
            checkpointDispute.challenge(
              inputs,
              challengeInputs,
              challengeWitness,
              {
                gasLimit: 1200000
              }
            )
          ).to.revertedWith('DepositContractAddress is invalid')
        })
      })
    })
  })

  describe('remove challenge', () => {
    async function prepareChallenge(falsy?: boolean) {
      const currentBlockNumber = await commitment.currentBlock()
      const nextBlockNumber = currentBlockNumber.toNumber() + 1
      const firstBlockInfo = prepareBlock(ALICE_ADDRESS, nextBlockNumber, falsy)
      await commitment.submitRoot(nextBlockNumber, firstBlockInfo.root)

      const secondBlockInfo = prepareBlock(BOB_ADDRESS, nextBlockNumber + 1)
      await commitment.submitRoot(nextBlockNumber + 1, secondBlockInfo.root)

      const inputs = [encodeStructable(secondBlockInfo.stateUpdate.property)]
      const witness = [encodeStructable(secondBlockInfo.inclusionProof)]

      await checkpointDispute.claim(inputs, witness, {
        gasLimit: 1200000
      })

      // prepare challenge
      const challengeInputs = [
        encodeStructable(firstBlockInfo.stateUpdate.property)
      ]
      const challengeWitness = [encodeStructable(firstBlockInfo.inclusionProof)]

      await checkpointDispute.challenge(
        inputs,
        challengeInputs,
        challengeWitness,
        {
          gasLimit: 1200000
        }
      )
      return {
        inputs,
        challengeInputs
      }
    }

    describe('succeed to remove challenge', () => {
      it('remove challenge', async () => {
        // state object of challengeInputs is always truthy when passing no arguments to `prepareChallenge`
        const { inputs, challengeInputs } = await prepareChallenge()

        await expect(
          checkpointDispute.removeChallenge(inputs, challengeInputs, [])
        ).to.emit(checkpointDispute, 'ChallengeRemoved')
      }).timeout(5000)
    })

    describe('fail to remove challenge', () => {
      it('cannot decide', async () => {
        // state object of challengeInputs is always truthy when passing no arguments to `prepareChallenge`
        const { inputs, challengeInputs } = await prepareChallenge(true)

        await expect(
          checkpointDispute.removeChallenge(inputs, challengeInputs, [])
        ).to.revertedWith('State object decided to false')
      }).timeout(5000)

      it('invalid inputs length', async () => {
        const { inputs, challengeInputs } = await prepareChallenge()
        await expect(
          checkpointDispute.removeChallenge(
            [...inputs, ...inputs],
            challengeInputs,
            [],
            {
              gasLimit: 120000
            }
          )
        ).to.be.reverted
      })

      it('invalid challengeInputs length', async () => {
        const { inputs, challengeInputs } = await prepareChallenge()
        await expect(
          checkpointDispute.removeChallenge(
            inputs,
            [...challengeInputs, ...challengeInputs],
            [],
            {
              gasLimit: 120000
            }
          )
        ).to.be.reverted
      })

      it('invalid inputs, stateUpdate bytes', async () => {
        const { challengeInputs } = await prepareChallenge()
        await expect(
          checkpointDispute.removeChallenge(['0x01'], challengeInputs, [], {
            gasLimit: 120000
          })
        ).to.be.reverted
      })

      it('invalid challengeInputs, stateUpdate bytes', async () => {
        const { inputs } = await prepareChallenge()
        await expect(
          checkpointDispute.removeChallenge(inputs, ['0x01'], [], {
            gasLimit: 120000
          })
        ).to.be.reverted
      })

      it('invalid challenge', async () => {
        const { inputs } = await prepareChallenge()
        const su = ownershipStateUpdate(
          Address.from(BOB_ADDRESS),
          1,
          0,
          5,
          true
        )
        await expect(
          checkpointDispute.removeChallenge(
            inputs,
            [encodeStructable(su.property)],
            [],
            {
              gasLimit: 120000
            }
          )
        ).to.be.reverted
      })
    })
  })
})
