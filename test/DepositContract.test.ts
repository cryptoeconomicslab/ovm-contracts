import chai from 'chai'
import {
  createMockProvider,
  deployContract,
  getWallets,
  solidity,
  link
} from 'ethereum-waffle'
import * as Utils from '../build/contracts/Utils.json'
import * as DepositContract from '../build/contracts/DepositContract.json'
import * as MockToken from '../build/contracts/MockToken.json'
import * as MockCommitmentContract from '../build/contracts/MockCommitmentContract.json'
import * as MockOwnershipPredicate from '../build/contracts/MockOwnershipPredicate.json'
import * as TestPredicate from '../build/contracts/TestPredicate.json'
import * as MockAdjudicationContract from '../build/contracts/MockAdjudicationContract.json'
import * as Deserializer from '../build/contracts/Deserializer.json'
import * as MockCheckpointDispute from '../build/contracts/MockExitDispute.json'
import * as MockExitDispute from '../build/contracts/MockExitDispute.json'
import * as ethers from 'ethers'
import {
  OvmProperty,
  encodeAddress,
  encodeProperty,
  encodeRange,
  encodeInteger
} from './helpers/utils'
import { getTransactionEvents } from './helpers/getTransactionEvent'
import { gasCost as GasCost } from './GasCost.test'
const abi = new ethers.utils.AbiCoder()
const { MaxUint256 } = ethers.constants

chai.use(solidity)
chai.use(require('chai-as-promised'))
const { expect, assert } = chai

describe('DepositContract', () => {
  let provider = createMockProvider()
  let wallets = getWallets(provider)
  let wallet = wallets[0]
  let mockTokenContract: ethers.Contract,
    testPredicate: ethers.Contract,
    mockOwnershipPredicate: ethers.Contract
  // mock adjudicator contracts
  let mockAdjudicationContract: ethers.Contract,
    mockFailingAdjudicationContract: ethers.Contract
  let mockCommitmentContract: ethers.Contract
  let depositContract: ethers.Contract,
    mockCheckpointDispute: ethers.Contract,
    mockExitDispute: ethers.Contract

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

    mockTokenContract = await deployContract(wallet, MockToken, [])
    mockExitDispute = await deployContract(wallet, MockExitDispute)
    mockCheckpointDispute = await deployContract(wallet, MockCheckpointDispute)

    depositContract = await deployContract(wallet, DepositContract, [
      mockTokenContract.address,
      mockCommitmentContract.address,
      mockCheckpointDispute.address,
      mockExitDispute.address
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
      assert.deepEqual(depositedRangeExtended.values.newRange, [
        ethers.utils.bigNumberify(0),
        ethers.utils.bigNumberify(1)
      ])

      const checkpointFinalized = events[1]
      assert.equal(
        checkpointFinalized.values.checkpointId,
        '0xe65405928ab9ebe13ff81bf8e639bec386bef715969e9d5e00a62a1647a22b8a'
      )
      assert.deepEqual(checkpointFinalized.values.checkpoint, [
        [
          encodeAddress(depositContract.address),
          encodeRange(0, 1),
          encodeInteger(100),
          encodeProperty(stateObject)
        ]
      ])

      const tx2 = await depositContract.deposit(2, stateObject)
      const events2 = await getTransactionEvents(provider, tx2, depositContract)
      const depositedRangeExtended2 = events2[0]
      assert.deepEqual(depositedRangeExtended2.values.newRange, [
        ethers.utils.bigNumberify(0),
        ethers.utils.bigNumberify(3)
      ])

      const checkpointFinalized2 = events2[1]
      assert.deepEqual(checkpointFinalized2.values.checkpoint, [
        [
          encodeAddress(depositContract.address),
          encodeRange(1, 3),
          encodeInteger(100),
          encodeProperty(stateObject)
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
    it('check gas cost', async () => {
      await mockTokenContract.approve(depositContract.address, 10)
      const gasCost = await depositContract.estimate.deposit(1, stateObject)
      expect(gasCost.toNumber()).to.be.lt(GasCost.DEPOSIT_CONTRACT_DEPOSIT)
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
        mockCheckpointDispute.address,
        mockExitDispute.address
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

    function su(range: number[], depositContractAddress?: string) {
      return [
        encodeAddress(depositContractAddress || depositContract.address),
        abi.encode(['tuple(uint256, uint256)'], [range]),
        encodeInteger(100),
        ownershipStateObject
      ]
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

    it('finalize Exit and ExitFinalized event should be fired', async () => {
      const tx = mockOwnershipPredicate.finalizeExit(su([0, 5]), 10, {
        gasLimit: 1000000
      })
      await expect(tx).to.emit(depositContract, 'ExitFinalized')
      const events = await getTransactionEvents(
        provider,
        await tx,
        depositContract
      )
      const depositedRangeRemoved = events[0]
      assert.deepEqual(depositedRangeRemoved.values.removedRange, [
        ethers.utils.bigNumberify(0),
        ethers.utils.bigNumberify(5)
      ])
    })

    it.skip('finalize ExitDeposit property and ExitFinalized event should be fired', async () => {
      const tx = mockOwnershipPredicate.finalizeExit(su([0, 7]), 10, {
        gasLimit: 1000000
      })
      await expect(tx).to.emit(depositContract, 'ExitFinalized')
    })

    it.skip('finalize ExitDeposit property throw checkpoint must be finalized exception', async () => {
      await expect(
        mockOwnershipPredicate.finalizeExit(su([0, 7]), 10, {
          gasLimit: 1000000
        })
      ).to.be.revertedWith('checkpoint must be finalized')
    })

    it('finalize Exit property and depositedId should be changed', async () => {
      const tx = mockOwnershipPredicate.finalizeExit(su([5, 10]), 10, {
        gasLimit: 1000000
      })
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

      const tx2 = mockOwnershipPredicate.finalizeExit(su([0, 5]), 5, {
        gasLimit: 1000000
      })
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
    it('check gas cost', async () => {
      const gasCost = await mockOwnershipPredicate.estimate.finalizeExit(
        su([5, 10]),
        10
      )
      expect(gasCost.toNumber()).to.be.lt(
        GasCost.DEPOSIT_CONTRACT_FINALIZE_EXIT
      )
    })
    it('fail to finalize exit because it is not called from ownership predicate', async () => {
      await expect(
        depositContract.finalizeExit(su([0, 5]), 10, {
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
      const invalidExitProperty = su([0, 5], ethers.constants.AddressZero)
      await expect(
        depositContract.finalizeExit(invalidExitProperty, 10, {
          gasLimit: 1000000
        })
      ).to.be.reverted
    })
    it('fail to finalize exit because of too big range', async () => {
      await expect(
        mockOwnershipPredicate.finalizeExit(su([0, 20]), 10, {
          gasLimit: 1000000
        })
      ).to.be.reverted
    })
    it('fail to finalize exit because of not deposited', async () => {
      await expect(
        mockOwnershipPredicate.finalizeExit(su([10, 15]), 20, {
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
