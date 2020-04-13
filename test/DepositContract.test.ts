import chai from 'chai'
import { MockProvider, deployContract, solidity, link } from 'ethereum-waffle'
import * as Utils from '../build/contracts/Utils.json'
import * as DepositContract from '../build/contracts/DepositContract.json'
import * as MockToken from '../build/contracts/MockToken.json'
import * as MockCommitmentContract from '../build/contracts/MockCommitmentContract.json'
import * as MockOwnershipPredicate from '../build/contracts/MockOwnershipPredicate.json'
import * as TestPredicate from '../build/contracts/TestPredicate.json'
import * as MockAdjudicationContract from '../build/contracts/MockAdjudicationContract.json'
import * as Deserializer from '../build/contracts/Deserializer.json'
import * as ethers from 'ethers'
import {
  OvmProperty,
  randomAddress,
  encodeAddress,
  encodeProperty,
  encodeRange,
  encodeInteger
} from './helpers/utils'
import { getTransactionEvents } from './helpers/getTransactionEvent'
const abi = new ethers.utils.AbiCoder()
const { MaxUint256 } = ethers.constants

chai.use(solidity)
const { expect, assert } = chai

describe('DepositContract', () => {
  let provider = new MockProvider()
  let wallets = provider.getWallets()
  let wallet = wallets[0]
  let mockTokenContract: ethers.Contract,
    testPredicate: ethers.Contract,
    mockOwnershipPredicate: ethers.Contract
  // mock adjudicator contracts
  let mockAdjudicationContract: ethers.Contract,
    mockFailingAdjudicationContract: ethers.Contract
  let mockCommitmentContract: ethers.Contract
  let mockStateUpdatePredicateContract: ethers.Contract
  let depositContract: ethers.Contract
  const checkpointPredicateAddress = randomAddress()
  const exitPredicateAddress = randomAddress()
  const exitDepositPredicateAddress = randomAddress()

  beforeEach(async () => {
    const deserializer = await deployContract(wallet, Deserializer, [])
    try {
      link(
        DepositContract,
        'contracts/Library/Deserializer.sol:Deserializer',
        deserializer.address
      )
    } catch (e) {
      // link fail in second time.
    }
    const utils = await deployContract(wallet, Utils, [])
    mockCommitmentContract = await deployContract(
      wallet,
      MockCommitmentContract,
      []
    )
    mockAdjudicationContract = await deployContract(
      wallet,
      MockAdjudicationContract,
      [false]
    )
    mockFailingAdjudicationContract = await deployContract(
      wallet,
      MockAdjudicationContract,
      [true]
    )
    testPredicate = await deployContract(wallet, TestPredicate, [
      mockAdjudicationContract.address,
      utils.address
    ])
    mockStateUpdatePredicateContract = await deployContract(
      wallet,
      TestPredicate,
      [mockAdjudicationContract.address, utils.address]
    )

    mockTokenContract = await deployContract(wallet, MockToken, [])
    depositContract = await deployContract(wallet, DepositContract, [
      mockTokenContract.address,
      mockCommitmentContract.address,
      mockAdjudicationContract.address,
      mockStateUpdatePredicateContract.address,
      exitPredicateAddress,
      exitDepositPredicateAddress
    ])
  })

  describe('deposit', () => {
    let stateObject: OvmProperty
    beforeEach(async () => {
      stateObject = {
        predicateAddress: testPredicate.address,
        inputs: ['0x01']
      }
    })
    it('succeed to deposit 1 MockToken', async () => {
      await mockTokenContract.approve(depositContract.address, 10)
      const tx = await depositContract.deposit(1, stateObject, {
        gasLimit: 1200000
      })
      const events = await getTransactionEvents(provider, tx, depositContract)
      const depositedRangeExtended = events[0]
      expect(depositedRangeExtended.values.newRange).to.deep.equal([
        ethers.utils.bigNumberify(0),
        ethers.utils.bigNumberify(1)
      ])

      const checkpointFinalized = events[1]
      assert.equal(
        checkpointFinalized.values.checkpointId,
        '0xc3acb1e01c944b0261c8ac68e6e18998e9a33a5e0e0452a3981f0a5498206087'
      )
      expect(checkpointFinalized.values.checkpoint).to.deep.equal([
        [
          mockStateUpdatePredicateContract.address,
          [
            encodeAddress(depositContract.address),
            encodeRange(0, 1),
            encodeInteger(100),
            encodeProperty(stateObject)
          ]
        ]
      ])

      const tx2 = await depositContract.deposit(2, stateObject)
      const events2 = await getTransactionEvents(provider, tx2, depositContract)
      const depositedRangeExtended2 = events2[0]
      expect(depositedRangeExtended2.values.newRange).to.deep.equal([
        ethers.utils.bigNumberify(0),
        ethers.utils.bigNumberify(3)
      ])

      const checkpointFinalized2 = events2[1]
      expect(checkpointFinalized2.values.checkpoint).to.deep.equal([
        [
          mockStateUpdatePredicateContract.address,
          [
            encodeAddress(depositContract.address),
            encodeRange(1, 3),
            encodeInteger(100),
            encodeProperty(stateObject)
          ]
        ]
      ])
    })
    it('fail to deposit 1 MockToken because of not approved', async () => {
      await mockTokenContract.setFailingMode(true)
      await expect(depositContract.deposit(1, stateObject)).to.be.reverted
    })
    it('Total deposited amount does not overflow', async () => {
      const amount = MaxUint256.sub(1)
      await mockTokenContract.approve(depositContract.address, amount)
      await expect(depositContract.deposit(amount, stateObject)).to.emit(
        depositContract,
        'CheckpointFinalized'
      )
      await expect(depositContract.deposit(1, stateObject)).to.be.revertedWith(
        'DepositContract: totalDeposited exceed max uint256'
      )
    })
  })

  describe('finalizeCheckpoint', () => {
    let checkpointProperty: OvmProperty
    beforeEach(async () => {
      const stateObject = abi.encode(
        ['tuple(address, bytes[])'],
        [[testPredicate.address, ['0x01']]]
      )

      checkpointProperty = {
        predicateAddress: testPredicate.address,
        inputs: [
          abi.encode(['tuple(uint256, uint256)'], [[0, 10]]),
          stateObject
        ]
      }
    })

    it('succeed to finalize checkpoint', async () => {
      await expect(
        depositContract.finalizeCheckpoint(checkpointProperty)
      ).to.emit(depositContract, 'CheckpointFinalized')
    })
    it('fail to finalize checkpoint because checkpoint claim not decided true', async () => {
      const depositContract = await deployContract(wallet, DepositContract, [
        mockTokenContract.address,
        mockCommitmentContract.address,
        mockFailingAdjudicationContract.address,
        mockStateUpdatePredicateContract.address,
        exitPredicateAddress,
        exitDepositPredicateAddress
      ])

      await expect(depositContract.finalizeCheckpoint(checkpointProperty)).to.be
        .reverted
    })
  })

  describe('finalizeExit', () => {
    let stateUpdateAddress = ethers.constants.AddressZero
    let ownershipStateObject: string
    // mock StateObject to deposit
    let stateObject

    function createStateUpdate(
      stateUpdateAddress: string,
      range: number[],
      depositContractAddress?: string
    ) {
      return encodeProperty({
        predicateAddress: stateUpdateAddress,
        inputs: [
          encodeAddress(depositContractAddress || depositContract.address),
          abi.encode(['tuple(uint256, uint256)'], [range]),
          encodeInteger(100),
          ownershipStateObject
        ]
      })
    }

    function createCheckpoint(range: number[], stateUpdate: string) {
      return encodeProperty({
        predicateAddress: checkpointPredicateAddress,
        inputs: [stateUpdate]
      })
    }

    function exitPropertyCreator(
      range: number[],
      depositContractAddress?: string
    ) {
      return {
        predicateAddress: exitPredicateAddress,
        inputs: [
          createStateUpdate(stateUpdateAddress, range, depositContractAddress),
          abi.encode(
            // address tree
            [
              'tuple(tuple(address, uint256, tuple(bytes32, address)[]), tuple(uint256, uint256, tuple(bytes32, uint256)[]))'
            ],
            [
              [
                [
                  depositContractAddress || depositContract.address,
                  0,
                  [
                    [
                      '0xdd779be20b84ced84b7cbbdc8dc98d901ecd198642313d35d32775d75d916d3a',
                      '0x0000000000000000000000000000000000000001'
                    ]
                  ]
                ],
                // interval tree
                [
                  0,
                  0,
                  [
                    [
                      '0x036491cc10808eeb0ff717314df6f19ba2e232d04d5f039f6fa382cae41641da',
                      7
                    ],
                    [
                      '0xef583c07cae62e3a002a9ad558064ae80db17162801132f9327e8bb6da16ea8a',
                      5000
                    ]
                  ]
                ]
              ]
            ]
          )
        ]
      }
    }

    function exitDepositPropertyCreator(
      stateUpdateAddress: string,
      range: number[],
      checkpointRange: number[],
      depositContractAddress: string
    ) {
      return {
        predicateAddress: exitDepositPredicateAddress,
        inputs: [
          createStateUpdate(stateUpdateAddress, range, depositContractAddress),
          createCheckpoint(
            checkpointRange,
            createStateUpdate(
              stateUpdateAddress,
              checkpointRange,
              depositContractAddress
            )
          )
        ]
      }
    }

    beforeEach(async () => {
      mockOwnershipPredicate = await deployContract(
        wallet,
        MockOwnershipPredicate,
        [depositContract.address]
      )
      ownershipStateObject = abi.encode(
        ['tuple(address, bytes[])'],
        [
          [
            mockOwnershipPredicate.address,
            [abi.encode(['address'], [wallet.address])]
          ]
        ]
      )
      stateObject = {
        predicateAddress: mockOwnershipPredicate.address,
        inputs: [abi.encode(['address'], [wallet.address])]
      }
      await mockTokenContract.approve(depositContract.address, 10)
      await depositContract.deposit(10, stateObject)
    })

    it('finalize Exit property and ExitFinalized event should be fired', async () => {
      const tx = mockOwnershipPredicate.finalizeExit(
        exitPropertyCreator([0, 5]),
        10,
        {
          gasLimit: 1000000
        }
      )
      await expect(tx).to.emit(depositContract, 'ExitFinalized')
      const events = await getTransactionEvents(
        provider,
        await tx,
        depositContract
      )
      const depositedRangeRemoved = events[0]
      expect(depositedRangeRemoved.values.removedRange).to.deep.equal([
        ethers.utils.bigNumberify(0),
        ethers.utils.bigNumberify(5)
      ])
    })

    it('finalize ExitDeposit property and ExitFinalized event should be fired', async () => {
      const tx = mockOwnershipPredicate.finalizeExit(
        exitDepositPropertyCreator(
          mockStateUpdatePredicateContract.address,
          [0, 7],
          [0, 10],
          depositContract.address
        ),
        10,
        {
          gasLimit: 1000000
        }
      )
      await expect(tx).to.emit(depositContract, 'ExitFinalized')
    })

    it('finalize ExitDeposit property throw checkpoint must be finalized exception', async () => {
      await expect(
        mockOwnershipPredicate.finalizeExit(
          exitDepositPropertyCreator(
            mockStateUpdatePredicateContract.address,
            [0, 7],
            [5, 10],
            depositContract.address
          ),
          10,
          {
            gasLimit: 1000000
          }
        )
      ).to.be.revertedWith('checkpoint must be finalized')
    })

    it('finalize Exit property and depositedId should be changed', async () => {
      const tx = mockOwnershipPredicate.finalizeExit(
        exitPropertyCreator([5, 10]),
        10,
        {
          gasLimit: 1000000
        }
      )
      await expect(tx).to.emit(depositContract, 'ExitFinalized')
      const events = await getTransactionEvents(
        provider,
        await tx,
        depositContract
      )
      const depositedRangeRemoved = events[0]
      assert.deepEqual(depositedRangeRemoved.values.removedRange, [
        ethers.utils.bigNumberify(5),
        ethers.utils.bigNumberify(10)
      ])

      const tx2 = mockOwnershipPredicate.finalizeExit(
        exitPropertyCreator([0, 5]),
        5,
        {
          gasLimit: 1000000
        }
      )
      await expect(tx2).to.emit(depositContract, 'ExitFinalized')
      const events2 = await getTransactionEvents(
        provider,
        await tx2,
        depositContract
      )
      const depositedRangeRemoved2 = events2[0]
      assert.deepEqual(depositedRangeRemoved2.values.removedRange, [
        ethers.utils.bigNumberify(0),
        ethers.utils.bigNumberify(5)
      ])
    })
    it('fail to finalize exit because it is not called from ownership predicate', async () => {
      await expect(
        depositContract.finalizeExit(exitPropertyCreator([0, 5]), 10, {
          gasLimit: 1000000
        })
      ).to.be.reverted
    })
    it('fail to finalize exit because of invalid deposit contract address', async () => {
      const stateObject = {
        predicateAddress: mockOwnershipPredicate.address,
        inputs: [abi.encode(['address'], [wallet.address])]
      }
      await mockTokenContract.approve(depositContract.address, 10)
      await depositContract.deposit(10, stateObject)
      const invalidExitProperty = exitPropertyCreator(
        [0, 5],
        ethers.constants.AddressZero
      )
      await expect(
        depositContract.finalizeExit(invalidExitProperty, 10, {
          gasLimit: 1000000
        })
      ).to.be.reverted
    })
    it('fail to finalize exit because of too big range', async () => {
      await expect(
        mockOwnershipPredicate.finalizeExit(exitPropertyCreator([0, 20]), 10, {
          gasLimit: 1000000
        })
      ).to.be.reverted
    })
    it('fail to finalize exit because of not deposited', async () => {
      await expect(
        mockOwnershipPredicate.finalizeExit(exitPropertyCreator([10, 15]), 20, {
          gasLimit: 1000000
        })
      ).to.be.reverted
    })
  })

  describe('extendDepositedRanges', () => {
    it('succeed to extend', async () => {
      await depositContract.extendDepositedRanges(500)
      const range = await depositContract.depositedRanges(500)
      assert.equal(range.end.toNumber(), 500)
    })
  })

  describe('removeDepositedRange', () => {
    beforeEach(async () => {
      await depositContract.extendDepositedRanges(500)
    })
    it('succeed to remove former', async () => {
      await depositContract.removeDepositedRange({ start: 0, end: 100 }, 500)
      const range = await depositContract.depositedRanges(500)
      assert.equal(range.start.toNumber(), 100)
      assert.equal(range.end.toNumber(), 500)
    })
    it('succeed to remove middle', async () => {
      await depositContract.removeDepositedRange({ start: 100, end: 200 }, 500)
      const range1 = await depositContract.depositedRanges(100)
      const range2 = await depositContract.depositedRanges(500)
      assert.equal(range1.start.toNumber(), 0)
      assert.equal(range1.end.toNumber(), 100)
      assert.equal(range2.start.toNumber(), 200)
      assert.equal(range2.end.toNumber(), 500)
    })
    it('succeed to remove later', async () => {
      await depositContract.removeDepositedRange({ start: 300, end: 500 }, 500)
      const range = await depositContract.depositedRanges(300)
      assert.equal(range.start.toNumber(), 0)
      assert.equal(range.end.toNumber(), 300)
    })
    it('fail to remove latter deposited range', async () => {
      await expect(
        depositContract.removeDepositedRange({ start: 300, end: 700 }, 500)
      ).to.be.reverted
    })
    it('fail to remove former deposited range', async () => {
      await depositContract.removeDepositedRange({ start: 0, end: 200 }, 500)
      await expect(
        depositContract.removeDepositedRange({ start: 0, end: 300 }, 500)
      ).to.be.reverted
    })
  })
})
