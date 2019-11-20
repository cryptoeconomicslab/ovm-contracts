import chai from 'chai'
import {
  createMockProvider,
  deployContract,
  getWallets,
  solidity
} from 'ethereum-waffle'
import * as MockAdjudicationContract from '../../../build/MockAdjudicationContract.json'
import * as Utils from '../../../build/Utils.json'
import * as IsValidSignaturePredicate from '../../../build/IsValidSignaturePredicate.json'
import * as ethers from 'ethers'

chai.use(solidity)
chai.use(require('chai-as-promised'))
const { expect, assert } = chai

describe('IsValidSignaturePredicate', () => {
  let provider = createMockProvider()
  let wallets = getWallets(provider)
  let wallet = wallets[0]
  let utils
  let isValidSignaturePredicate: ethers.Contract
  let adjudicationContract: ethers.Contract

  beforeEach(async () => {
    utils = await deployContract(wallet, Utils, [])
    adjudicationContract = await deployContract(
      wallet,
      MockAdjudicationContract,
      [utils.address]
    )
    isValidSignaturePredicate = await deployContract(
      wallet,
      IsValidSignaturePredicate,
      [adjudicationContract.address, utils.address]
    )
  })

  describe('decideTrue', () => {
    const verifierType = ethers.utils.toUtf8Bytes('secp256k1')
    it('suceed to decide', async () => {
      const wallet = ethers.Wallet.createRandom()
      const signingKey = new ethers.utils.SigningKey(wallet.privateKey)
      const message = ethers.utils.toUtf8Bytes('message')
      const signature = ethers.utils.joinSignature(
        signingKey.signDigest(
          ethers.utils.arrayify(ethers.utils.keccak256(message))
        )
      )
      await isValidSignaturePredicate.decideTrue([
        ethers.utils.hexlify(message),
        signature,
        wallet.address,
        verifierType
      ])
    })
    it('fail to decide', async () => {
      await expect(
        isValidSignaturePredicate.decideTrue(['0x01', '0x', '0x', verifierType])
      ).to.be.reverted
    })
  })
})
