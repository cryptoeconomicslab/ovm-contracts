import chai from 'chai'
import {
  createMockProvider,
  deployContract,
  getWallets,
  solidity,
  link
} from 'ethereum-waffle'
import * as PlasmaERC20 from '../build/contracts/PlasmaETH.json'
import * as MockDepositContract from '../build/contracts/MockDepositContract.json'
import * as Deserializer from '../build/contracts/Deserializer.json'
import * as ethers from 'ethers'
import { randomAddress } from './helpers/utils'

chai.use(solidity)
chai.use(require('chai-as-promised'))
const { expect, assert } = chai

describe('PlasmaETH', () => {
  let provider = createMockProvider()
  let wallets = getWallets(provider)
  let wallet = wallets[0]
  let plasmaERC20Contract: ethers.Contract, mockDepositContract: ethers.Contract
  const ether10 = ethers.utils.parseEther('10.0')
  const stateObject = {
    predicateAddress: randomAddress(),
    inputs: ['0x01']
  }

  beforeEach(async () => {
    const deserializer = await deployContract(wallet, Deserializer, [])
    try {
      link(
        MockDepositContract,
        'contracts/test/Library/Deserializer.sol:Deserializer',
        deserializer.address
      )
    } catch (e) {
      // link fail in second time.
    }
    plasmaERC20Contract = await deployContract(wallet, PlasmaERC20, [
      'PETH',
      'PlasmaETH',
      18
    ])
    mockDepositContract = await deployContract(wallet, MockDepositContract, [
      plasmaERC20Contract.address
    ])
    await plasmaERC20Contract.setDepositContractAddress(
      mockDepositContract.address
    )
  })

  describe('deposit', () => {
    beforeEach(async () => {})

    it('succeed to deposit 10 ether', async () => {
      await plasmaERC20Contract.deposit(ether10, stateObject, {
        value: ether10
      })
    })

    it('fail to deposit 10 ether', async () => {
      await expect(
        plasmaERC20Contract.deposit(ether10, stateObject)
      ).to.be.revertedWith('_amount and msg.value must be same value')
    })
  })

  describe('unwrap', () => {
    beforeEach(async () => {})

    it('succeed to unwrap', async () => {
      await plasmaERC20Contract.deposit(ether10, stateObject, {
        value: ether10
      })
      await plasmaERC20Contract.unwrap(ether10)
    })

    it('fail to unwrap', async () => {
      await expect(plasmaERC20Contract.unwrap(ether10)).to.be.revertedWith(
        'PlasmaETH: unwrap amount exceeds balance'
      )
    })
  })
})
