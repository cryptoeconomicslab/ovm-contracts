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
import * as ethers from 'ethers'
import { OvmProperty, randomAddress, encodeProperty } from './helpers/utils'
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
  let mockStateUpdatePredicateContract: ethers.Contract

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
    // mockTokenContract = await deployContract(wallet, PETH, [])
    // await mockTokenContract.mint(wallet.address, 100)
  })

  describe('deposit', () => {
    let depositContract: ethers.Contract
    let stateObject: OvmProperty
    beforeEach(async () => {
      depositContract = await deployContract(wallet, DepositContract, [
        mockTokenContract.address,
        mockCommitmentContract.address,
        mockAdjudicationContract.address,
        mockStateUpdatePredicateContract.address
      ])
      stateObject = {
        predicateAddress: testPredicate.address,
        inputs: ['0x01']
      }
    })
    it('succeed to deposit 1 MockToken', async () => {
      await mockTokenContract.approve(depositContract.address, 10)
      await expect(depositContract.deposit(1, stateObject)).to.emit(
        depositContract,
        'CheckpointFinalized'
      )
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
    let depositContract
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
      depositContract = await deployContract(wallet, DepositContract, [
        mockTokenContract.address,
        mockCommitmentContract.address,
        mockAdjudicationContract.address,
        mockStateUpdatePredicateContract.address
      ])
      await expect(
        depositContract.finalizeCheckpoint(checkpointProperty)
      ).to.emit(depositContract, 'CheckpointFinalized')
    })
    it('fail to finalize checkpoint because checkpoint claim not decided true', async () => {
      depositContract = await deployContract(wallet, DepositContract, [
        mockTokenContract.address,
        mockCommitmentContract.address,
        mockFailingAdjudicationContract.address,
        mockStateUpdatePredicateContract.address
      ])
      await expect(depositContract.finalizeCheckpoint(checkpointProperty)).to.be
        .reverted
    })
  })

  describe('finalizeExit', () => {
    let depositContract: any
    let stateUpdateAddress = ethers.constants.AddressZero
    let ownershipStateObject: string

    function exitPropertyCreator(
      range: number[],
      depositContractAddress?: string
    ) {
      return {
        predicateAddress: testPredicate.address,
        inputs: [
          abi.encode(['tuple(uint256, uint256)'], [range]),
          abi.encode(
            ['tuple(address, bytes[])'],
            [
              [
                stateUpdateAddress,
                [
                  depositContractAddress || depositContract.address,
                  abi.encode(['tuple(uint256, uint256)'], [[0, 10]]),
                  abi.encode(['uint256'], [0]),
                  ownershipStateObject
                ]
              ]
            ]
          )
        ]
      }
    }

    beforeEach(async () => {
      depositContract = await deployContract(wallet, DepositContract, [
        mockTokenContract.address,
        mockCommitmentContract.address,
        mockAdjudicationContract.address,
        mockStateUpdatePredicateContract.address
      ])
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
    })
    it('succeed to finalize exit', async () => {
      // Deposit 10 Mock Token
      const stateObject = {
        predicateAddress: mockOwnershipPredicate.address,
        inputs: [abi.encode(['address'], [wallet.address])]
      }
      await mockTokenContract.approve(depositContract.address, 10)
      await depositContract.deposit(10, stateObject)
      // Start test
      await expect(
        mockOwnershipPredicate.finalizeExit(exitPropertyCreator([0, 5]), 10, {
          gasLimit: 1000000
        })
      ).to.emit(depositContract, 'ExitFinalized')
    })
    it('succeed to finalize exit and depositedId is changed', async () => {
      const stateObject = {
        predicateAddress: mockOwnershipPredicate.address,
        inputs: [abi.encode(['address'], [wallet.address])]
      }
      await mockTokenContract.approve(depositContract.address, 10)
      await depositContract.deposit(10, stateObject)
      // Start test
      await expect(
        mockOwnershipPredicate.finalizeExit(exitPropertyCreator([5, 10]), 10, {
          gasLimit: 1000000
        })
      ).to.emit(depositContract, 'ExitFinalized')
      await expect(
        mockOwnershipPredicate.finalizeExit(exitPropertyCreator([0, 5]), 5, {
          gasLimit: 1000000
        })
      ).to.emit(depositContract, 'ExitFinalized')
    })
    it('fail to finalize exit because it is not called from ownership predicate', async () => {
      const stateObject = {
        predicateAddress: mockOwnershipPredicate.address,
        inputs: [abi.encode(['address'], [wallet.address])]
      }
      await mockTokenContract.approve(depositContract.address, 10)
      await depositContract.deposit(10, stateObject)
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
      const stateObject = {
        predicateAddress: mockOwnershipPredicate.address,
        inputs: [abi.encode(['address'], [wallet.address])]
      }
      await mockTokenContract.approve(depositContract.address, 10)
      await depositContract.deposit(10, stateObject)
      await expect(
        mockOwnershipPredicate.finalizeExit(exitPropertyCreator([0, 20]), 10, {
          gasLimit: 1000000
        })
      ).to.be.reverted
    })
    it('fail to finalize exit because of not deposited', async () => {
      await expect(
        mockOwnershipPredicate.finalizeExit(exitPropertyCreator([0, 5]), 10, {
          gasLimit: 1000000
        })
      ).to.be.reverted
    })
  })

  describe('extendDepositedRanges', () => {
    let depositContract: any
    beforeEach(async () => {
      depositContract = await deployContract(wallet, DepositContract, [
        mockTokenContract.address,
        mockCommitmentContract.address,
        mockAdjudicationContract.address,
        mockStateUpdatePredicateContract.address
      ])
    })
    it('succeed to extend', async () => {
      await depositContract.extendDepositedRanges(500)
      const range = await depositContract.depositedRanges(500)
      assert.equal(range.end.toNumber(), 500)
    })
  })

  describe('removeDepositedRange', () => {
    let depositContract: ethers.Contract
    beforeEach(async () => {
      depositContract = await deployContract(wallet, DepositContract, [
        mockTokenContract.address,
        mockCommitmentContract.address,
        mockAdjudicationContract.address,
        mockStateUpdatePredicateContract.address
      ])
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
