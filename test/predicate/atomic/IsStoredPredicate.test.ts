import chai from 'chai'
import {
  createMockProvider,
  deployContract,
  getWallets,
  solidity
} from 'ethereum-waffle'
import { encodeAddress } from '../../helpers/utils'
import * as MockAdjudicationContract from '../../../build/contracts/MockAdjudicationContract.json'
import * as MockStorageContract from '../../../build/contracts/MockStorage.json'
import * as Utils from '../../../build/contracts/Utils.json'
import * as IsStoredPredicate from '../../../build/contracts/IsStoredPredicate.json'
import * as ethers from 'ethers'

chai.use(solidity)
chai.use(require('chai-as-promised'))
const { expect, assert } = chai

describe('IsStoredPredicate', () => {
  let provider = createMockProvider()
  let wallets = getWallets(provider)
  let wallet = wallets[0]
  let isStoredPredicate: ethers.Contract
  let adjudicationContract: ethers.Contract
  let storageContract: ethers.Contract

  beforeEach(async () => {
    const utils = await deployContract(wallet, Utils, [])
    adjudicationContract = await deployContract(
      wallet,
      MockAdjudicationContract,
      [utils.address]
    )
    storageContract = await deployContract(wallet, MockStorageContract, [])
    isStoredPredicate = await deployContract(wallet, IsStoredPredicate, [
      adjudicationContract.address,
      utils.address
    ])
  })

  describe('decideTrue', () => {
    const key = '0x01'
    const value = '0x01'
    const falseValue = '0x02'

    it('suceed to decide', async () => {
      const address = encodeAddress(storageContract.address)
      await storageContract.set(value)
      await isStoredPredicate.decideTrue([address, key, value])
    })

    it('fail to decide', async () => {
      const address = encodeAddress(storageContract.address)
      await storageContract.set(value)
      await expect(isStoredPredicate.decideTrue([address, key, falseValue])).to
        .be.reverted
    })
  })
})
