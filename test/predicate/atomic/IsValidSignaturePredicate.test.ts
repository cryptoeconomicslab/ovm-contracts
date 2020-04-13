import chai from 'chai'
import { MockProvider, deployContract, solidity, link } from 'ethereum-waffle'
import * as MockAdjudicationContract from '../../../build/contracts/MockAdjudicationContract.json'
import * as Utils from '../../../build/contracts/Utils.json'
import * as ECRecover from '../../../build/contracts/ECRecover.json'
import * as IsValidSignaturePredicate from '../../../build/contracts/IsValidSignaturePredicate.json'
import * as ethers from 'ethers'
import { hexlify, toUtf8Bytes } from 'ethers/utils'
import { encodeConstant, encodeAddress } from '../../helpers/utils'

chai.use(solidity)
const { expect, assert } = chai

describe('IsValidSignaturePredicate', () => {
  let provider = new MockProvider()
  let wallets = provider.getWallets()
  let wallet = wallets[0]
  let isValidSignaturePredicate: ethers.Contract
  let adjudicationContract: ethers.Contract

  beforeEach(async () => {
    const ecRecover = await deployContract(wallet, ECRecover, [])
    try {
      link(
        IsValidSignaturePredicate,
        'contracts/Library/ECRecover.sol:ECRecover',
        ecRecover.address
      )
    } catch (e) {
      // link fail in second time.
    }
    const utils = await deployContract(wallet, Utils, [])
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
    const verifierType = encodeConstant('secp256k1')
    const address = '0xa7E678F5F3Db99bf4957AC2ebEb3a89C6f9031F6'
    const signature =
      '0x3050ed8255d5599ebce4be5ef23eceeb61bfae924db5e5b12fc975663854629204a68351940fcea4231e9e4af515e2a10c187fcd7f88f4e5ffed218c76a5553b1b'
    const invalidSignature =
      '0x00b0ed8255d5599ebce4be5ef23eceeb16bfae924db5e5b12fc975663854629204a68351940fcea4231e9e4af515e2a10c187fcd7f88f4e5ffed218c76a1113bb2'

    const message = hexlify(toUtf8Bytes('message'))
    it('suceed to decide', async () => {
      await isValidSignaturePredicate.decideTrue([
        message,
        signature,
        encodeAddress(address),
        verifierType
      ])
    })
    it('fail to decide with invalid signature', async () => {
      await expect(
        isValidSignaturePredicate.decideTrue([
          message,
          invalidSignature,
          address,
          verifierType
        ])
      ).to.be.reverted
    })
    it('fail to decide with empty signature', async () => {
      await expect(
        isValidSignaturePredicate.decideTrue([
          message,
          '0x',
          address,
          verifierType
        ])
      ).to.be.reverted
    })
  })
})
