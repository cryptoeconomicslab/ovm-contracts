import chai from 'chai'
import {
  createMockProvider,
  deployContract,
  getWallets,
  solidity,
  link
} from 'ethereum-waffle'
import * as MockDepositContract from '../../../build/contracts/MockDepositContract.json'
import * as Utils from '../../../build/contracts/Utils.json'
import * as OwnershipPayout from '../../../build/contracts/OwnershipPayout.json'
import * as MockOwnershipPredicate from '../../../build/contracts/MockOwnershipPredicate.json'
import * as MockToken from '../../../build/contracts/MockToken.json'
import * as Deserializer from '../../../build/contracts/Deserializer.json'
import * as ethers from 'ethers'
import {
  encodeRange,
  encodeProperty,
  randomAddress,
  OvmProperty,
  encodeInteger,
  encodeAddress
} from '../../helpers/utils'
import {GasCost} from './../../GasCost.test'
chai.use(solidity)
chai.use(require('chai-as-promised'))
const { expect } = chai

const abi = new ethers.utils.AbiCoder()

describe('OwnershipPayout', () => {
  let provider = createMockProvider()
  let wallets = getWallets(provider)
  let wallet = wallets[0]
  let ownershipPayout: ethers.Contract
  let mockDepositContract: ethers.Contract
  let mockOwnershipPredicate: ethers.Contract
  const exitPredicateAddress = randomAddress()
  const stateUpdateAddress = randomAddress()

  beforeEach(async () => {
    const deserializer = await deployContract(wallet, Deserializer, [])
    try {
      link(
        MockDepositContract,
        'contracts/Library/Deserializer.sol:Deserializer',
        deserializer.address
      )
    } catch (e) {
      // link fail in second time.
    }
    const utils = await deployContract(wallet, Utils, [])
    const mockToken = await deployContract(wallet, MockToken, [])
    ownershipPayout = await deployContract(wallet, OwnershipPayout, [
      utils.address
    ])
    mockOwnershipPredicate = await deployContract(
      wallet,
      MockOwnershipPredicate,
      [ethers.constants.AddressZero]
    )
    mockDepositContract = await deployContract(wallet, MockDepositContract, [
      mockToken.address
    ])
    await mockOwnershipPredicate.setPayoutContractAddress(
      ownershipPayout.address
    )
  })

  describe('finalizeExit', () => {
    function makeExitProperty(stateObject: OvmProperty) {
      return {
        predicateAddress: exitPredicateAddress,
        inputs: [
          encodeProperty({
            predicateAddress: stateUpdateAddress,
            inputs: [
              encodeAddress(ethers.constants.AddressZero),
              encodeRange(0, 100),
              encodeInteger(0),
              encodeProperty(stateObject)
            ]
          }),
          abi.encode(
            // address tree
            [
              'tuple(tuple(address, uint256, tuple(bytes32, address)[]), tuple(uint256, uint256, tuple(bytes32, uint256)[]))'
            ],
            [
              [
                [
                  mockDepositContract.address,
                  0,
                  [
                    [
                      '0xdd779be20b84ced84b7cbbdc8dc98d901ecd198642313d35d32775d75d916d3a',
                      '0x0000000000000000000000000000000000000001'
                    ]
                  ]
                ],
                // interval tree
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
        ]
      }
    }
    it('succeed', async () => {
      const stateObject = {
        predicateAddress: mockOwnershipPredicate.address,
        inputs: [encodeAddress(wallets[0].address)]
      }

      await ownershipPayout.finalizeExit(
        mockDepositContract.address,
        makeExitProperty(stateObject),
        0,
        wallet.address
      )

      expect(true).to.be.true
    })
    it('check gas cost', async () => {
      const stateObject = {
        predicateAddress: mockOwnershipPredicate.address,
        inputs: [encodeAddress(wallets[0].address)]
      }

      const gasCost = await ownershipPayout.estimate.finalizeExit(
        mockDepositContract.address,
        makeExitProperty(stateObject),
        0,
        wallet.address
      )
      expect(gasCost.toNumber()).to.be.lt(GasCost.OWNERSHIP_PAYMENT_FINALIZE_EXIT)
    })
    it('throw exception', async () => {
      const stateObject = {
        predicateAddress: mockOwnershipPredicate.address,
        inputs: [encodeAddress(wallets[1].address)]
      }

      await expect(
        ownershipPayout.finalizeExit(
          mockDepositContract.address,
          makeExitProperty(stateObject),
          0,
          wallet.address
        )
      ).to.be.revertedWith('msg.sender must be owner')
    })
  })
})
