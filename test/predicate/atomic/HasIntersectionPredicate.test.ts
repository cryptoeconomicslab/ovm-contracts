import chai from 'chai'
import {
  createMockProvider,
  deployContract,
  getWallets,
  solidity
} from 'ethereum-waffle'
import * as MockAdjudicationContract from '../../../build/contracts/MockAdjudicationContract.json'
import * as Utils from '../../../build/contracts/Utils.json'
import * as HasIntersectionPredicate from '../../../build/contracts/HasIntersectionPredicate.json'
import * as ethers from 'ethers'
import { encodeRange } from '../../helpers/utils'

chai.use(solidity)
chai.use(require('chai-as-promised'))
const { expect, assert } = chai

describe('HasIntersectionPredicate', () => {
  let provider = createMockProvider()
  let wallets = getWallets(provider)
  let wallet = wallets[0]
  let hasIntersectionPredicate: ethers.Contract
  let adjudicationContract: ethers.Contract

  beforeEach(async () => {
    const utils = await deployContract(wallet, Utils, [])
    adjudicationContract = await deployContract(
      wallet,
      MockAdjudicationContract,
      [utils.address]
    )
    hasIntersectionPredicate = await deployContract(
      wallet,
      HasIntersectionPredicate,
      [adjudicationContract.address, utils.address]
    )
  })

  it('decide true', async () => {
    const input0 = encodeRange(0, 10)
    const input1 = encodeRange(4, 15)
    await hasIntersectionPredicate.decideTrue([input0, input1])
  })

  it('decide true: A is contained by B', async () => {
    const input0 = encodeRange(5, 10)
    const input1 = encodeRange(0, 20)
    await hasIntersectionPredicate.decideTrue([input0, input1])
  })

  it('decide true: B is contained by A', async () => {
    const input0 = encodeRange(0, 20)
    const input1 = encodeRange(5, 10)
    await hasIntersectionPredicate.decideTrue([input0, input1])
  })

  it('decide false', async () => {
    const input0 = encodeRange(0, 10)
    const input1 = encodeRange(10, 20)
    await expect(hasIntersectionPredicate.decideTrue([input0, input1])).to.be
      .reverted
  })
})
