import chai from 'chai'
import {
  createMockProvider,
  deployContract,
  getWallets,
  solidity
} from 'ethereum-waffle'
import * as MockAdjudicationContract from '../../../build/contracts/MockAdjudicationContract.json'
import * as MockCommitmentContract from '../../../build/contracts/MockCommitmentContract.json'
import * as Utils from '../../../build/contracts/Utils.json'
import * as VerifyInclusionPredicate from '../../../build/contracts/VerifyInclusionPredicate.json'
import * as ethers from 'ethers'
import { encodeRange, encodeAddress } from '../../helpers/utils'
const abi = new ethers.utils.AbiCoder()

chai.use(solidity)
chai.use(require('chai-as-promised'))
const { expect } = chai

describe('VerifyInclusionPredicate', () => {
  let provider = createMockProvider()
  let wallets = getWallets(provider)
  let wallet = wallets[0]
  let verifyInclusionPredicate: ethers.Contract
  let adjudicationContract: ethers.Contract
  let mockCommitmentContract: ethers.Contract

  beforeEach(async () => {
    const utils = await deployContract(wallet, Utils, [])
    mockCommitmentContract = await deployContract(
      wallet,
      MockCommitmentContract,
      []
    )
    adjudicationContract = await deployContract(
      wallet,
      MockAdjudicationContract,
      [utils.address]
    )
    verifyInclusionPredicate = await deployContract(
      wallet,
      VerifyInclusionPredicate,
      [
        adjudicationContract.address,
        utils.address,
        mockCommitmentContract.address
      ]
    )
  })

  describe('decide', () => {
    const leaf = ethers.utils.keccak256(ethers.utils.toUtf8Bytes('leaf'))
    const token = encodeAddress(ethers.constants.AddressZero)
    const range = encodeRange(100, 200)
    const inclusionProof = abi.encode(
      [
        'tuple(tuple(address, uint256, tuple(bytes32, address)[]), tuple(uint256, uint256, tuple(bytes32, uint256)[]))'
      ],
      [
        [
          [
            '0x0000000000000000000000000000000000000000',
            0,
            [
              [
                '0xdd779be20b84ced84b7cbbdc8dc98d901ecd198642313d35d32775d75d916d3a',
                '0x0000000000000000000000000000000000000001'
              ]
            ]
          ],
          [
            0,
            0,
            [
              [
                '0x036491cc10808eeb0ff717314df6f19ba2e232d04d5f039f6fa382cae41641da',
                7
              ],
              [
                '0xef583c07cae62e3a002a9ad558064ae80db17162801132f9327e8bb6da16ea8a',
                5000
              ]
            ]
          ]
        ]
      ]
    )
    // encoded inclusion proof for client unit test
    // https://github.com/cryptoeconomicslab/wakkanay/pull/254/files#diff-a95d4fc2393c9b384bbaa32722b99b71R454
    expect(inclusionProof).to.eq(
      '0x0000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000600000000000000000000000000000000000000000000000000000000000000001dd779be20b84ced84b7cbbdc8dc98d901ecd198642313d35d32775d75d916d3a00000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000600000000000000000000000000000000000000000000000000000000000000002036491cc10808eeb0ff717314df6f19ba2e232d04d5f039f6fa382cae41641da0000000000000000000000000000000000000000000000000000000000000007ef583c07cae62e3a002a9ad558064ae80db17162801132f9327e8bb6da16ea8a0000000000000000000000000000000000000000000000000000000000001388'
    )
    const blockNumber = abi.encode(['uint256'], [120])

    it('suceed to decide', async () => {
      await verifyInclusionPredicate.decide([
        leaf,
        token,
        range,
        inclusionProof,
        blockNumber
      ])
    })

    it('fail to decide with invalid abi', async () => {
      await expect(
        verifyInclusionPredicate.decide([
          leaf,
          token,
          leaf,
          inclusionProof,
          blockNumber
        ])
      ).to.be.reverted
    })
  })
})
