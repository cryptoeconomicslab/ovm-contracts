import * as OwnershipPredicate from '../../../build/contracts/OwnershipPredicate.json'
import { ethers } from 'ethers'
import {
  encodeLabel,
  encodeString,
  encodeProperty,
  encodeVariable
} from '../../helpers/utils'

const transaction = '0x001234567890'
const signature = '0x001234567890'

export const createOwnershipTestCase = (
  [notAddress, andAddress, forAllSuchThatAddress]: string[],
  wallet: ethers.Wallet
) => {
  return {
    name: 'OwnershipPredicate',
    contract: OwnershipPredicate,
    extraArgs: [encodeString('secp256k1')],
    validChallenges: [
      {
        name:
          'Valid challenge of OwnershipT(owner, tx) is Bytes().all(v0 -> !IsValidSignature(tx, v0, owner, secp256k1))',
        getProperty: (
          ownershipPredicate: ethers.Contract,
          compiledPredicate: ethers.Contract
        ) => {
          return {
            predicateAddress: ownershipPredicate.address,
            inputs: [encodeLabel('OwnershipT'), wallet.address, transaction]
          }
        },
        getChallenge: (
          ownershipPredicate: ethers.Contract,
          mockAtomicPredicateAddress: string,
          compiledPredicate: ethers.Contract
        ) => {
          return {
            predicateAddress: forAllSuchThatAddress,
            inputs: [
              '0x',
              encodeString('v0'),
              encodeProperty({
                predicateAddress: notAddress,
                inputs: [
                  encodeProperty({
                    predicateAddress: mockAtomicPredicateAddress,
                    inputs: [
                      transaction,
                      encodeVariable('v0'),
                      wallet.address,
                      encodeString('secp256k1')
                    ]
                  })
                ]
              })
            ]
          }
        }
      }
    ],
    invalidChallenges: [],
    decideTrueTestCases: [
      {
        name: 'OwnershipT(owner, tx) should be true',
        createParameters: (compiledPredicate: ethers.Contract) => {
          return {
            inputs: [encodeLabel('OwnershipT'), wallet.address, transaction],
            witnesses: [signature]
          }
        }
      }
    ],
    invalidDecideTestCases: [
      {
        name: 'OwnershipT(owner) throw exception',
        createParameters: (compiledPredicate: ethers.Contract) => {
          return {
            inputs: [encodeLabel('OwnershipT'), wallet.address],
            witnesses: [signature]
          }
        }
      }
    ]
  }
}
