import * as Swap from '../../../build/contracts/Swap.json'
import * as Swap2 from '../../../build/contracts/Swap2.json'
import * as Confsig from '../../../build/contracts/Confsig.json'

import { ethers } from 'ethers'
import {
  encodeLabel,
  encodeString,
  encodeProperty,
  encodeVariable,
  encodeConstant,
  encodeRange,
  encodeInteger
} from '../../helpers/utils'
import {
  TestContext,
  TestCaseSet
} from '@cryptoeconomicslab/ovm-ethereum-generator/lib/helper'

console.log('Swap', Swap.evm.bytecode.object.length / 2)
console.log('Swap2', Swap2.evm.bytecode.object.length / 2)
console.log('Confsig', Confsig.evm.bytecode.object.length / 2)

const so = encodeProperty({
  predicateAddress: ethers.constants.AddressZero,
  inputs: []
})
const transaction = encodeProperty({
  predicateAddress: ethers.constants.AddressZero,
  inputs: [so, so, so, so]
})
const signature =
  '0x0012345678900000000000000000000000000000000000000000000000000000'

export const createSwapTestCase = (wallet: ethers.Wallet): TestCaseSet => {
  return {
    name: 'Swap',
    deploy: [
      {
        contract: Confsig,
        getExtraArgs: (context: TestContext) => [encodeString('secp256k1')]
      },
      {
        contract: Swap2,
        getExtraArgs: (context: TestContext) => [
          context.deployedContractAddresses[0]
        ]
      },
      {
        contract: Swap,
        getExtraArgs: (context: TestContext) => [
          context.deployedContractAddresses[1],
          encodeString('secp256k1')
        ]
      }
    ],
    validChallenges: [
      {
        name: 'SwapA',
        getTestData: (swapPredicate: ethers.Contract, context: TestContext) => {
          return {
            challengeInputs: [encodeInteger(1)],
            property: {
              predicateAddress: swapPredicate.address,
              inputs: [
                encodeLabel('SwapPredicateA'),
                wallet.address,
                wallet.address,
                ethers.constants.AddressZero,
                encodeRange(0, 10),
                encodeInteger(12),
                transaction
              ]
            },
            challenge: {
              predicateAddress: context.forAllSuchThat,
              inputs: [
                '0x',
                encodeString('v0'),
                encodeProperty({
                  predicateAddress: context.not,
                  inputs: [
                    encodeProperty({
                      predicateAddress: context.mockAtomicPredicate,
                      inputs: [
                        transaction,
                        wallet.address,
                        encodeVariable('v0'),
                        encodeConstant('secp256k1')
                      ]
                    })
                  ]
                })
              ]
            }
          }
        }
      }
    ],
    invalidChallenges: [],
    decideTrueTestCases: [
      {
        name: 'SwapA',
        getTestData: (swapPredicate: ethers.Contract, context: TestContext) => {
          return {
            inputs: [
              encodeLabel('SwapA'),
              wallet.address,
              wallet.address,
              ethers.constants.AddressZero,
              encodeRange(0, 10),
              encodeInteger(10),
              transaction
            ],
            witnesses: [
              signature,
              so,
              so,
              so,
              so,
              so,
              so,
              so,
              so,
              so,
              signature
            ]
          }
        }
      }
    ],
    invalidDecideTestCases: [
      {
        name: 'invalid SwapA',
        getTestData: (swapPredicate: ethers.Contract, context: TestContext) => {
          return {
            inputs: [
              encodeLabel('SwapA'),
              wallet.address,
              wallet.address,
              ethers.constants.AddressZero,
              encodeRange(0, 10),
              encodeInteger(10),
              transaction
            ],
            witnesses: [
              signature,
              signature,
              signature,
              signature,
              signature,
              signature,
              signature
            ]
          }
        }
      }
    ]
  }
}
