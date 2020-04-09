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
  let bobWallet = wallets[1]
  let plasmaERC20Contract: ethers.Contract
  let bobPlasmaERC20Contract: ethers.Contract

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
    bobPlasmaERC20Contract = new ethers.Contract(
      plasmaERC20Contract.address,
      PlasmaERC20.abi,
      bobWallet
    )
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
    beforeEach(async () => {})

    it('succeed to transfer', async () => {
      await plasmaERC20Contract.wrap(ether10, {
        value: ether10
      })
      await plasmaERC20Contract.approve(bobWallet.address, ether10)
      await bobPlasmaERC20Contract.transfer(wallet.address, ether10)
    })

    it('fail to transfer due to insufficient approved amount', async () => {
      await expect(
        bobPlasmaERC20Contract.transfer(wallet.address, ether10)
      ).to.be.revertedWith('PlasmaETH: transfer amount exceeds approved amount')
    })

    it('fail to transfer due to insufficient balance', async () => {
      await plasmaERC20Contract.approve(bobWallet.address, ether10)
      await expect(
        bobPlasmaERC20Contract.transfer(wallet.address, ether10)
      ).to.be.revertedWith('PlasmaETH: unwrap amount exceeds balance')
    })
  })
})
