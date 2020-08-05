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
import * as MockCheckpointDispute from '../build/contracts/MockCheckpointDispute.json'
import * as MockExitDispute from '../build/contracts/MockExitDispute.json'
import * as ethers from 'ethers'
import { OvmProperty, encodeStateUpdate } from './helpers/utils'
import { getTransactionEvents } from './helpers/getTransactionEvent'
import { gasCost as GasCost } from './GasCost.test'
const abi = new ethers.utils.AbiCoder()
const { MaxUint256 } = ethers.constants
const { bigNumberify } = ethers.utils

chai.use(solidity)
chai.use(require('chai-as-promised'))
const { expect, assert } = chai

function range(start: number, end: number) {
  return [bigNumberify(start), bigNumberify(end)]
}

describe('DepositContract', () => {
  let utils: ethers.Contract, deserializer: ethers.Contract
  let provider = createMockProvider()
  let wallets = getWallets(provider)
  let wallet = wallets[0]
  let mockTokenContract: ethers.Contract,
    testPredicate: ethers.Contract,
    mockOwnershipPredicate: ethers.Contract
  // mock adjudicator contracts
  let mockAdjudicationContract: ethers.Contract,
    mockCommitmentContract: ethers.Contract,
    depositContract: ethers.Contract,
    mockCheckpointDispute: ethers.Contract,
    mockExitDispute: ethers.Contract

  before(async () => {
    deserializer = await deployContract(wallet, Deserializer, [])
    utils = await deployContract(wallet, Utils, [])
  })

  beforeEach(async () => {
    try {
      link(
        DepositContract,
        'contracts/Library/Deserializer.sol:Deserializer',
        deserializer.address
      )
    } catch (e) {
      // link fail in second time.
    }
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

    mockOwnershipPredicate = await deployContract(
      wallet,
      MockOwnershipPredicate,
      [depositContract.address]
    )
  })

  describe('deposit', () => {
    let stateObject: OvmProperty
    beforeEach(() => {
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
      assert.deepEqual(depositedRangeExtended.values.newRange, range(0, 1))

      const checkpointFinalized = events[1]
      assert.deepEqual(checkpointFinalized.values.checkpoint, [
        depositContract.address,
        range(0, 1),
        bigNumberify(100),
        [stateObject.predicateAddress, stateObject.inputs]
      ])

      const tx2 = await depositContract.deposit(2, stateObject)
      const events2 = await getTransactionEvents(provider, tx2, depositContract)
      const depositedRangeExtended2 = events2[0]
      assert.deepEqual(depositedRangeExtended2.values.newRange, range(0, 3))

      const checkpointFinalized2 = events2[1]
      assert.deepEqual(checkpointFinalized2.values.checkpoint, [
        depositContract.address,
        range(1, 3),
        bigNumberify(100),
        [stateObject.predicateAddress, stateObject.inputs]
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
    it('succeed to finalize checkpoint called by CheckpointDispute', async () => {
      const su = encodeStateUpdate(depositContract.address, [0, 10], 5, {
        predicateAddress: testPredicate.address,
        inputs: ['0x01']
      })
      await expect(mockCheckpointDispute.settle([su])).to.emit(
        depositContract,
        'CheckpointFinalized'
      )
    })

    it('fail to finalize checkpoint msg.sender is not checkpointDispute', async () => {
      await expect(
        depositContract.finalizeCheckpoint([
          depositContract.address,
          range(0, 10),
          5,
          [testPredicate.address, ['0x01']]
        ])
      ).to.be.reverted
    })
  })

  describe('finalizeExit', () => {
    // mock StateObject to deposit
    let stateObject: OvmProperty

    function su(range: number[], depositContractAddress?: string) {
      return [
        depositContractAddress || depositContract.address,
        range,
        100,
        [stateObject.predicateAddress, stateObject.inputs]
      ]
    }

    beforeEach(async () => {
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

    it('finalize ExitDeposit property and ExitFinalized event should be fired', async () => {
      const tx = mockOwnershipPredicate.finalizeExit(su([0, 7]), 10, {
        gasLimit: 1000000
      })
      await expect(tx).to.emit(depositContract, 'ExitFinalized')
    })

    it('finalize ExitDeposit property throw exit claim must be settled exception', async () => {
      await mockExitDispute.setClaimDecision(false, { gasLimit: 100000 })
      await expect(
        mockOwnershipPredicate.finalizeExit(su([0, 7]), 10, {
          gasLimit: 1000000
        })
      ).to.be.revertedWith('exit claim must be settled to true')
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
