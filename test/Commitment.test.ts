import chai from 'chai'
import {
  createMockProvider,
  deployContract,
  getWallets,
  solidity
} from 'ethereum-waffle'
import * as Commitment from '../build/contracts/Commitment.json'
import * as ethers from 'ethers'

chai.use(solidity)
chai.use(require('chai-as-promised'))
const { expect } = chai

describe('Commitment', () => {
  let provider = createMockProvider()
  let wallets = getWallets(provider)
  let wallet = wallets[0]
  let commitment: any
  const root = ethers.utils.keccak256(
    ethers.utils.arrayify(ethers.constants.HashZero)
  )

  beforeEach(async () => {
    commitment = await deployContract(wallet, Commitment, [
      wallet.address
    ])
  })

  describe('submitRoot', () => {
    it('succeed to submit root', async () => {
      await expect(commitment.submitRoot(1, root)).to.emit(
        commitment,
        'BlockSubmitted'
      )
    })
    it('check gas cost', async () => {
      const gasCost = await commitment.estimate.submitRoot(1, root)
      expect(gasCost.toNumber()).to.be.lt(67000)
    })
    it('fail to submit root because of unregistered operator address', async () => {
      const commitmentContractFromOtherWallet = commitment.connect(
        wallets[1]
      )
      await expect(commitmentContractFromOtherWallet.submitRoot(1, root)).to.be
        .reverted
    })
    it('fail to submit root because of invalid block number', async () => {
      await expect(commitment.submitRoot(0, root)).to.be.reverted
    })
  })

  describe('getCurrentBlock', () => {
    beforeEach(async () => {
      await expect(commitment.submitRoot(1, root)).to.emit(
        commitment,
        'BlockSubmitted'
      )
    })

    it('suceed to get current block', async () => {
      const currentBlock = await commitment.currentBlock()
      expect(currentBlock).to.be.equal(1)
    })
  })

  describe('blocks', () => {
    beforeEach(async () => {
      await expect(commitment.submitRoot(1, root)).to.emit(
        commitment,
        'BlockSubmitted'
      )
    })

    it('suceed to get a block', async () => {
      const block = await commitment.blocks(1)
      expect(block).to.be.equal(root)
    })
  })
})
