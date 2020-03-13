import * as OwnershipPredicate from '../../../build/contracts/OwnershipPredicate.json'
import { ethers } from 'ethers'
import {
  encodeLabel,
  encodeString,
  encodeProperty,
  encodeVariable,
  encodeConstant
} from '../../helpers/utils'
import {
  TestCaseSet,
  TestContext
} from '@cryptoeconomicslab/ovm-ethereum-generator/lib/helper'

const transaction = '0x000000000000000000000000000000000000000012'
const signature = '0x00000000000000000000000000000000000000001234567890'

export const createOwnershipTestCase = (wallet: ethers.Wallet): TestCaseSet => {
  return {
    name: 'OwnershipPredicate',
    deploy: [
      {
        contract: OwnershipPredicate,
        getExtraArgs: (context: TestContext) => [encodeString('secp256k1')]
      }
    ],
    validChallenges: [
      {
        name:
          'Valid challenge of OwnershipT(owner, tx) is Bytes().all(v0 -> !IsValidSignature(tx, v0, owner, secp256k1))',
        getTestData: (
          ownershipPredicate: ethers.Contract,
          context: TestContext
        ) => {
          return {
            challengeInputs: [],
            property: {
              predicateAddress: ownershipPredicate.address,
              inputs: [encodeLabel('OwnershipT'), wallet.address, transaction]
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
                        encodeVariable('v0'),
                        wallet.address,
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
        name: 'OwnershipT(owner, tx) should be true',
        getTestData: (
          andTestPredicate: ethers.Contract,
          context: TestContext
        ) => {
          return {
            inputs: [encodeLabel('OwnershipT'), wallet.address, transaction],
            witnesses: [signature]
          }
        }
      }
    ],
    invalidDecideTestCases: [
      {
        name: 'OwnershipT(owner, tx) throw exception',
        getTestData: (
          andTestPredicate: ethers.Contract,
          context: TestContext
        ) => {
          return {
            inputs: [encodeLabel('OwnershipT'), wallet.address],
            witnesses: [signature]
          }
        }
      }
    ]
  }
}
