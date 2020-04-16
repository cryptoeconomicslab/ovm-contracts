import * as IncludedAtPredicate from '../../../build/contracts/IncludedAtPredicate.json'
import { ethers } from 'ethers'
import {
  encodeLabel,
  encodeString,
  encodeProperty,
  encodeVariable,
  encodeRange,
  encodeInteger
} from '../../helpers/utils'

const token = ethers.constants.AddressZero
const commitmentContract = ethers.constants.AddressZero
const range = encodeRange(0, 100)
const blockNumber = encodeInteger(10)
const leaf = '0x'
const proof = '0x'
const root = '0x'

export const createIncludedAtTestCase = (
  [notAddress, andAddress, forAllSuchThatAddress]: string[],
  wallet: ethers.Wallet
) => {
  return {
    name: 'IncludedAtPredicate',
    contract: IncludedAtPredicate,
    extraArgs: [],
    validChallenges: [
      {
        name:
          'Valid challenge of IncludedAtT(proof,leaf,token,range,b,commitmentContract) is Bytes().all(root -> !IncludedAtTA(commitmentContract,b,root,leaf,token,range,proof))',
        getProperty: (
          includedAtPredicate: ethers.Contract,
          compiledPredicate: ethers.Contract
        ) => {
          return {
            predicateAddress: includedAtPredicate.address,
            inputs: [
              encodeLabel('IncludedAtT'),
              proof,
              leaf,
              token,
              range,
              blockNumber,
              commitmentContract
            ]
          }
        },
        getChallenge: (
          includedAtPredicate: ethers.Contract,
          mockAtomicPredicateAddress: string,
          compiledPredicate: ethers.Contract
        ) => {
          return {
            predicateAddress: forAllSuchThatAddress,
            inputs: [
              '0x',
              encodeString('root'),
              encodeProperty({
                predicateAddress: notAddress,
                inputs: [
                  encodeProperty({
                    predicateAddress: includedAtPredicate.address,
                    inputs: [
                      encodeLabel('IncludedAtTA'),
                      commitmentContract,
                      blockNumber,
                      encodeVariable('root'),
                      leaf,
                      token,
                      range,
                      proof
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
        name:
          'IncludedAtT(proof,leaf,token,range,b,commitmentContract) should be true',
        createParameters: (compiledPredicate: ethers.Contract) => {
          return {
            inputs: [
              encodeLabel('IncludedAtT'),
              proof,
              leaf,
              token,
              range,
              blockNumber,
              commitmentContract
            ],
            witnesses: [root]
          }
        }
      }
    ],
    invalidDecideTestCases: []
  }
}
