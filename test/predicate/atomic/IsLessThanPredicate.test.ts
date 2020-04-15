import chai from 'chai'
import {
  createMockProvider,
  deployContract,
  getWallets,
  solidity
} from 'ethereum-waffle'
import * as MockAdjudicationContract from '../../../build/contracts/MockAdjudicationContract.json'
import * as Utils from '../../../build/contracts/Utils.json'
import * as IsLessThanPredicate from '../../../build/contracts/IsLessThanPredicate.json'
import * as ethers from 'ethers'
import { AbiCoder } from 'ethers/utils'

chai.use(solidity)
chai.use(require('chai-as-promised'))
const { expect } = chai

describe('IsLessThanPredicate', () => {
  let provider = createMockProvider()
  let wallets = getWallets(provider)
  let wallet = wallets[0]
  let isLessThanPredicate: ethers.Contract
  let adjudicationContract: ethers.Contract

  beforeEach(async () => {
    const utils = await deployContract(wallet, Utils, [])
    adjudicationContract = await deployContract(
      wallet,
      MockAdjudicationContract,
      [utils.address]
    )
    isLessThanPredicate = await deployContract(wallet, IsLessThanPredicate, [
      adjudicationContract.address,
      utils.address
    ])
  })

  describe('decideTrue', () => {
    const abi = new AbiCoder()
    const input0 = abi.encode(['uint256'], [0])
    const input1 = abi.encode(['uint256'], [1])

    it('suceed to decide', async () => {
      await isLessThanPredicate.decideTrue([input0, input1])
    })

    it('fail to decide', async () => {
      await expect(isLessThanPredicate.decideTrue([input1, input0])).to.be
        .reverted
    })
  })
})
