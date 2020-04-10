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

chai.use(solidity)
chai.use(require('chai-as-promised'))
const { expect, assert } = chai

describe('PlasmaETH', () => {
  let provider = createMockProvider()
  let wallets = getWallets(provider)
  let wallet = wallets[0]
  let plasmaERC20Contract: ethers.Contract

  const ether10 = ethers.utils.parseEther('10.0')

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
  })

  describe('wrap', () => {
    beforeEach(async () => {})

    it('succeed to wrap 10 ether', async () => {
      await plasmaERC20Contract.wrap(ether10, {
        value: ether10
      })
    })

    it('fail to wrap 10 ether', async () => {
      await expect(plasmaERC20Contract.wrap(ether10)).to.be.revertedWith(
        '_amount and msg.value must be same value'
      )
    })
  })

  describe('unwrap', () => {
    beforeEach(async () => {})

    it('succeed to unwrap', async () => {
      await plasmaERC20Contract.wrap(ether10, {
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

  describe('transfer', () => {
    const bob = '0xe1269DB510588Ed1302d16A4C2f02Ab377CAB0bC'

    beforeEach(async () => {})

    it('succeed to transfer', async () => {
      await plasmaERC20Contract.wrap(ether10, {
        value: ether10
      })
      await plasmaERC20Contract.transfer(bob, ether10)
      expect(await provider.getBalance(bob)).equal(ether10)
    })

    it('fail to transfer due to insufficient balance', async () => {
      await expect(
        plasmaERC20Contract.transfer(bob, ether10)
      ).to.be.revertedWith('ERC20: transfer amount exceeds balance')
    })
  })
})
