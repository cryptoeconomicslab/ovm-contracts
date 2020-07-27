import chai from 'chai'
import {
  createMockProvider,
  deployContract,
  getWallets,
  solidity,
  link
} from 'ethereum-waffle'
import * as MockDepositContract from '../../../build/contracts/MockDepositContract.json'
import * as Utils from '../../../build/contracts/Utils.json'
import * as OwnershipPayout from '../../../build/contracts/OwnershipPayout.json'
import * as MockOwnershipPredicate from '../../../build/contracts/MockOwnershipPredicate.json'
import * as MockToken from '../../../build/contracts/MockToken.json'
import * as Deserializer from '../../../build/contracts/Deserializer.json'
import * as ethers from 'ethers'
import { OvmProperty, encodeAddress } from '../../helpers/utils'
import { gasCost as GasCost } from './../../GasCost.test'
chai.use(solidity)
chai.use(require('chai-as-promised'))
const { expect } = chai

describe('OwnershipPayout', () => {
  let provider = createMockProvider()
  let wallets = getWallets(provider)
  let wallet = wallets[0]
  let ownershipPayout: ethers.Contract
  let mockDepositContract: ethers.Contract
  let mockOwnershipPredicate: ethers.Contract

  beforeEach(async () => {
    const deserializer = await deployContract(wallet, Deserializer, [])
    try {
      link(
        MockDepositContract,
        'contracts/Library/Deserializer.sol:Deserializer',
        deserializer.address
      )
    } catch (e) {
      // link fail in second time.
    }
    const utils = await deployContract(wallet, Utils, [])
    const mockToken = await deployContract(wallet, MockToken, [])
    ownershipPayout = await deployContract(wallet, OwnershipPayout, [
      utils.address
    ])
    mockOwnershipPredicate = await deployContract(
      wallet,
      MockOwnershipPredicate,
      [ethers.constants.AddressZero]
    )
    mockDepositContract = await deployContract(wallet, MockDepositContract, [
      mockToken.address
    ])
    await mockOwnershipPredicate.setPayoutContractAddress(
      ownershipPayout.address
    )
  })

  describe('finalizeExit', () => {
    function su(stateObject: OvmProperty) {
      return [
        ethers.constants.AddressZero,
        [0, 100],
        0,
        [stateObject.predicateAddress, stateObject.inputs]
      ]
    }

    it('succeed', async () => {
      const stateObject = {
        predicateAddress: mockOwnershipPredicate.address,
        inputs: [encodeAddress(wallets[0].address)]
      }

      await ownershipPayout.finalizeExit(
        mockDepositContract.address,
        su(stateObject),
        0,
        wallet.address
      )

      expect(true).to.be.true
    })
    it('check gas cost', async () => {
      const stateObject = {
        predicateAddress: mockOwnershipPredicate.address,
        inputs: [encodeAddress(wallets[0].address)]
      }

      const gasCost = await ownershipPayout.estimate.finalizeExit(
        mockDepositContract.address,
        su(stateObject),
        0,
        wallet.address
      )
      expect(gasCost.toNumber()).to.be.lt(
        GasCost.OWNERSHIP_PAYMENT_FINALIZE_EXIT
      )
    })
    it('throw exception', async () => {
      const stateObject = {
        predicateAddress: mockOwnershipPredicate.address,
        inputs: [encodeAddress(wallets[1].address)]
      }

      await expect(
        ownershipPayout.finalizeExit(
          mockDepositContract.address,
          su(stateObject),
          0,
          wallet.address
        )
      ).to.be.revertedWith('msg.sender must be owner')
    })
  })
})
