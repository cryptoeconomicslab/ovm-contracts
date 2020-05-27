import * as StateUpdatePredicate from '../../../build/contracts/StateUpdatePredicate.json'
import { ethers } from 'ethers'
import {
  encodeLabel,
  encodeString,
  encodeProperty,
  encodeVariable,
  randomAddress,
  encodeRange,
  encodeInteger,
  encodeAddress
} from '../../helpers/utils'
const abi = new ethers.utils.AbiCoder()

const txAddress = randomAddress()
const token = ethers.constants.AddressZero
const range = encodeRange(0, 100)
const blockNumber = encodeInteger(10)

export const createStateUpdateTestCase = (
  [notAddress, andAddress, forAllSuchThatAddress]: string[],
  wallet: ethers.Wallet
) => {
  return {
    name: 'StateUpdatePredicate',
    contract: StateUpdatePredicate,
    extraArgs: [encodeAddress(txAddress)],
    validChallenges: [
      {
        name:
          'Valid challenge of StateUpdateT(token, range, b, so) is Bytes().all(tx -> !StateUpdateTA(tx, token, range, b, so))',
        getProperty: (
          stateUpdatePredicate: ethers.Contract,
          compiledPredicate: ethers.Contract
        ) => {
          return {
            predicateAddress: stateUpdatePredicate.address,
            inputs: [
              encodeLabel('StateUpdateT'),
              token,
              range,
              blockNumber,
              encodeProperty({
                predicateAddress: compiledPredicate.address,
                inputs: ['0x01']
              })
            ]
          }
        },
        getChallenge: (
          stateUpdatePredicate: ethers.Contract,
          mockAtomicPredicateAddress: string,
          compiledPredicate: ethers.Contract
        ) => {
          return {
            predicateAddress: forAllSuchThatAddress,
            inputs: [
              '0x',
              encodeString('tx'),
              encodeProperty({
                predicateAddress: notAddress,
                inputs: [
                  encodeProperty({
                    predicateAddress: stateUpdatePredicate.address,
                    inputs: [
                      encodeLabel('StateUpdateTA'),
                      encodeVariable('tx'),
                      token,
                      range,
                      blockNumber,
                      encodeProperty({
                        predicateAddress: compiledPredicate.address,
                        inputs: ['0x01']
                      })
                    ]
                  })
                ]
              })
            ]
          }
        }
      }
    ],
    invalidChallenges: [
      {
        name: 'Invalid challenge of StateUpdateT(token, range, b, so)',
        getProperty: (
          stateUpdatePredicate: ethers.Contract,
          compiledPredicate: ethers.Contract
        ) => {
          return {
            predicateAddress: stateUpdatePredicate.address,
            inputs: [
              encodeLabel('StateUpdateT'),
              token,
              range,
              blockNumber,
              encodeProperty({
                predicateAddress: compiledPredicate.address,
                inputs: ['0x01']
              })
            ]
          }
        },
        getChallenge: (
          stateUpdatePredicate: ethers.Contract,
          mockAtomicPredicateAddress: string,
          compiledPredicate: ethers.Contract
        ) => {
          return {
            predicateAddress: forAllSuchThatAddress,
            inputs: [
              '0x',
              encodeString('tx'),
              encodeProperty({
                predicateAddress: notAddress,
                inputs: [
                  encodeProperty({
                    predicateAddress: stateUpdatePredicate.address,
                    inputs: [
                      encodeLabel('StateUpdateTA'),
                      encodeVariable('tx'),
                      token,
                      range,
                      blockNumber,
                      encodeProperty({
                        predicateAddress: compiledPredicate.address,
                        inputs: ['0x02']
                      })
                    ]
                  })
                ]
              })
            ]
          }
        }
      }
    ],
    decideTrueTestCases: [
      {
        name: 'StateUpdateT(token, range, b, so) should be true',
        createParameters: (compiledPredicate: ethers.Contract) => {
          const stateObject = encodeProperty({
            predicateAddress: compiledPredicate.address,
            inputs: ['0x01']
          })
          const tx = encodeProperty({
            predicateAddress: txAddress,
            inputs: [token, range, blockNumber, stateObject]
          })
          return {
            inputs: [
              encodeLabel('StateUpdateT'),
              token,
              range,
              blockNumber,
              stateObject
            ],
            witnesses: [
              tx,
              '0x00000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000003000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000000a000000000000000000000000000000000000000000000000000000000000000e0000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000000',
              abi.encode(['bytes[]'], [['0x']])
            ]
          }
        }
      }
    ],
    invalidDecideTestCases: []
  }
}
