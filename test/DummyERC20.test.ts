import chai from 'chai'
import {
  createMockProvider,
  deployContract,
  getWallets,
  solidity,
  link
} from 'ethereum-waffle'
import * as DummyERC20 from '../build/contracts/DummyERC20.json'
import * as MockDepositContract from '../build/contracts/MockDepositContract.json'
import * as Deserializer from '../build/contracts/Deserializer.json'
import * as ethers from 'ethers'

chai.use(solidity)
chai.use(require('chai-as-promised'))
const { expect, assert } = chai

describe('DummyERC20', () => {
  let provider = createMockProvider()
  let wallets = getWallets(provider)
  let wallet = wallets[0]
  let dummyERC20Contract: ethers.Contract

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
    dummyERC20Contract = await deployContract(wallet, DummyERC20, [
      'DUM',
      'DummyERC20',
      18,
      wallet.address
    ])
  })

  describe('mint', () => {
    beforeEach(async () => {})

    it('succeed to mint 10 ether', async () => {
      await dummyERC20Contract.mint(wallet.address, ether10)
      const balance = await dummyERC20Contract.balanceOf(wallet.address)
      expect(balance).to.equal(ether10)
    })

    it('fail to mint 10 ether', async () => {
      const connection = dummyERC20Contract.connect(wallets[1])
      await expect(connection.mint(wallet.address, ether10)).to.be.revertedWith(
        'only minter can mint'
      )
    })
  })
})
