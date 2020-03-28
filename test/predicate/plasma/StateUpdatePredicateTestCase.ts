import * as StateUpdatePredicate from '../../../build/contracts/StateUpdatePredicate.json'
import { ethers } from 'ethers'
import {
  encodeLabel,
  encodeString,
  encodeProperty,
  encodeVariable,
  randomAddress,
  encodeRange,
  encodeInteger
} from '../../helpers/utils'
import {
  TestCaseSet,
  TestContext,
  encodeChildWitnesses
} from '@cryptoeconomicslab/ovm-ethereum-generator/lib/helper'

const txAddress = randomAddress()
const token = ethers.constants.AddressZero
const range = encodeRange(0, 100)
const blockNumber = encodeInteger(10)

export const createStateUpdateTestCase = (
  wallet: ethers.Wallet
): TestCaseSet => {
  return {
    name: 'StateUpdatePredicate',
    deploy: [
      {
        contract: StateUpdatePredicate,
        getExtraArgs: (context: TestContext) => [txAddress]
      }
    ],
    validChallenges: [
      {
        name:
          'Valid challenge of StateUpdateT(token, range, b, so) is Bytes().all(tx -> !StateUpdateTA(tx, token, range, b, so))',
        getTestData: (
          stateUpdatePredicate: ethers.Contract,
          context: TestContext
        ) => {
          return {
            challengeInputs: [],
            property: {
              predicateAddress: stateUpdatePredicate.address,
              inputs: [
                encodeLabel('StateUpdateT'),
                token,
                range,
                blockNumber,
                encodeProperty({
                  predicateAddress: context.mockCompiledPredicate,
                  inputs: ['0x01']
                })
              ]
            },
            challenge: {
              predicateAddress: context.forAllSuchThat,
              inputs: [
                '0x',
                encodeString('tx'),
                encodeProperty({
                  predicateAddress: context.not,
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
                          predicateAddress: context.mockCompiledPredicate,
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
      }
    ],
    invalidChallenges: [
      {
        name: 'Invalid challenge of StateUpdateT(token, range, b, so)',
        getTestData: (
          stateUpdatePredicate: ethers.Contract,
          context: TestContext
        ) => {
          return {
            challengeInputs: [],
            property: {
              predicateAddress: stateUpdatePredicate.address,
              inputs: [
                encodeLabel('StateUpdateT'),
                token,
                range,
                blockNumber,
                encodeProperty({
                  predicateAddress: context.mockCompiledPredicate,
                  inputs: ['0x01']
                })
              ]
            },
            challenge: {
              predicateAddress: context.forAllSuchThat,
              inputs: [
                '0x',
                encodeString('tx'),
                encodeProperty({
                  predicateAddress: context.not,
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
                          predicateAddress: context.mockCompiledPredicate,
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
      }
    ],
    decideTrueTestCases: [
      {
        name: 'StateUpdateT(token, range, b, so) should be true',
        getTestData: (
          stateUpdatePredicate: ethers.Contract,
          context: TestContext
        ) => {
          const stateObject = encodeProperty({
            predicateAddress: context.mockCompiledPredicate,
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
            witnesses: [tx, encodeChildWitnesses([]), '0x00', '0x00']
          }
        }
      }
    ],
    invalidDecideTestCases: []
  }
}
