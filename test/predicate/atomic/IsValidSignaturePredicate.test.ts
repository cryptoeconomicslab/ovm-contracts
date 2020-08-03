import chai from 'chai'
import {
  createMockProvider,
  deployContract,
  getWallets,
  solidity,
  link
} from 'ethereum-waffle'
import * as MockAdjudicationContract from '../../../build/contracts/MockAdjudicationContract.json'
import * as Utils from '../../../build/contracts/Utils.json'
import * as ECRecover from '../../../build/contracts/ECRecover.json'
import * as IsValidSignaturePredicate from '../../../build/contracts/IsValidSignaturePredicate.json'
import * as MockOwnershipPredicate from '../../../build/contracts/MockOwnershipPredicate.json'
import * as ethers from 'ethers'
import { hexlify, toUtf8Bytes, bigNumberify, arrayify } from 'ethers/utils'
import {
  encodeConstant,
  encodeAddress,
  randomAddress,
  encodeProperty,
  encodeInteger,
  encodeString
} from '../../helpers/utils'
import { signTypedDataLegacy } from 'eth-sig-util'
import { Bytes } from '@cryptoeconomicslab/primitives'
import { createTypedParams } from '@cryptoeconomicslab/ovm'
import { setupContext } from '@cryptoeconomicslab/context'
import { EthCoder } from '@cryptoeconomicslab/eth-coder'
setupContext({ coder: EthCoder })

chai.use(solidity)
chai.use(require('chai-as-promised'))
const { expect, assert } = chai
const abi = new ethers.utils.AbiCoder()

let config = {
  deployedPredicateTable: {
    OwnershipPredicate: {
      deployedAddress: '0x13274fe19c0178208bcbee397af8167a7be27f6f',
      source: [
        {
          type: 'CompiledPredicate',
          name: 'Ownership',
          inputDefs: [
            { name: 'owner', type: 'Address' },
            { name: 'tx', type: 'Property' }
          ],
          contracts: [],
          entryPoint: 'OwnershipT',
          constants: [{ varType: 'bytes', name: 'verifierType' }]
        }
      ]
    }
  }
}

describe('IsValidSignaturePredicate', () => {
  let provider = createMockProvider()
  let wallets = getWallets(provider)
  let wallet = wallets[0]
  let isValidSignaturePredicate: ethers.Contract
  let adjudicationContract: ethers.Contract
  let ownershipPredicate: ethers.Contract

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
    ownershipPredicate = await deployContract(wallet, MockOwnershipPredicate, [
      randomAddress()
    ])
    config.deployedPredicateTable.OwnershipPredicate.deployedAddress =
      ownershipPredicate.address
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
    it('succeed with typedData', async () => {
      const verifierType = encodeConstant('typedData')
      const signature =
        '0xb41282cc44851d39f386938b85c059bbae39d32fb5f7cfbfd46b73db2c4d531f7ddf3f7374b1f30ecfdf951591bad9a6db66ee3c3913a624bb74ee6d143b29791b'
      const message =
        '0x0000000000000000000000000000000000000000000000000000000000000020000000000000000000000000bd2c938b9f6bfc1a66368d08cb44dc3eb2ae27be0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000016345785d8a0000000000000000000000000000000000000000000000000000000000000000000600000000000000000000000000000000000000000000000000000000000000c0000000000000000000000000da7718cd604f4bf8e8d55153be83f683a1765490000000000000000000000000baaa2a3237035a2c7fa2a33c76b44a8c6fe18e870000000000000000000000000000000000000000000000000000000000000040000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000020000000000000000000000000243edc380b7cca06e701506ebeb074ebafd4f002'
      const address =
        '0x000000000000000000000000da7718cd604f4bf8e8d55153be83f683a1765490'
      await isValidSignaturePredicate.decideTrue([
        message,
        signature,
        address,
        verifierType
      ])
    })
    it.skip('decide with typedData', async () => {
      const txAddress = ethers.constants.AddressZero
      const depositContractAddress = encodeAddress(
        '0x4e71920b7330515faf5ea0c690f1ad06a85fb60c'
      )
      const range = abi.encode(
        ['tuple(uint256, uint256)'],
        [[0, bigNumberify('100000000000000000')]]
      )
      const maxBlockNumber = encodeInteger(0)
      const owner = encodeAddress(ethers.constants.AddressZero)
      const tx = encodeProperty({
        predicateAddress: txAddress,
        inputs: [
          depositContractAddress,
          range,
          maxBlockNumber,
          encodeProperty({
            predicateAddress: ownershipPredicate.address,
            inputs: [owner]
          })
        ]
      })
      const signature = signTypedDataLegacy(
        Buffer.from(arrayify(wallet.privateKey)),
        { data: createTypedParams(config as any, Bytes.fromHexString(tx)) }
      )

      const result = await isValidSignaturePredicate.decide([
        tx,
        signature,
        encodeAddress(wallet.address),
        encodeString('typedData')
      ])
      expect(result).to.true
    })
    it('fail to decide with verifier type because of invalid transaction', async () => {
      await expect(
        isValidSignaturePredicate.decideTrue([
          message,
          signature,
          address,
          encodeString('typedData')
        ])
      ).to.be.reverted
    })
    it('fail to decide with unknown verifier type', async () => {
      await expect(
        isValidSignaturePredicate.decideTrue([
          message,
          signature,
          encodeAddress(address),
          encodeString('unknown')
        ])
      ).to.be.revertedWith('unknown verifier type')
    })
  })
})
