/* contract imports */
import chai from 'chai'
import { MockProvider, deployContract, solidity } from 'ethereum-waffle'
import * as MockChallenge from '../build/contracts/MockChallenge.json'
import * as OrPredicate from '../build/contracts/OrPredicate.json'
import * as ethers from 'ethers'
import { OvmProperty, randomAddress, encodeProperty } from './helpers/utils'

chai.use(solidity)
chai.use(require('chai-as-promised'))
const { expect, assert } = chai

describe('OrPredicate', () => {
  let provider = new MockProvider()
  let wallets = provider.getWallets()
  let wallet = wallets[0]
  let orPredicate: ethers.Contract
  const boolAddress = randomAddress()
  const notAddress = randomAddress()
  const andAddress = randomAddress()
  let mockChallenge: ethers.Contract
  let orProperty: OvmProperty

  beforeEach(async () => {
    mockChallenge = await deployContract(wallet, MockChallenge, [])
    orPredicate = await deployContract(wallet, OrPredicate, [
      notAddress,
      andAddress
    ])
    orProperty = {
      predicateAddress: orPredicate.address,
      inputs: [
        encodeProperty({
          predicateAddress: boolAddress,
          inputs: ['0x01']
        }),
        encodeProperty({
          predicateAddress: boolAddress,
          inputs: ['0x02']
        })
      ]
    }
  })

  describe('isValidChallenge', () => {
    it('suceed to challenge or(a, b) with and(not(a), not(b))', async () => {
      const challengeProperty = {
        predicateAddress: andAddress,
        inputs: [
          encodeProperty({
            predicateAddress: notAddress,
            inputs: [
              encodeProperty({
                predicateAddress: boolAddress,
                inputs: ['0x01']
              })
            ]
          }),
          encodeProperty({
            predicateAddress: notAddress,
            inputs: [
              encodeProperty({
                predicateAddress: boolAddress,
                inputs: ['0x02']
              })
            ]
          })
        ]
      }
      const result = await mockChallenge.isValidChallenge(
        orProperty,
        [],
        challengeProperty
      )
      assert.isTrue(result)
    })
    it('fail to challenge or(a, b) with and(not(a), b)', async () => {
      const challengeProperty = {
        predicateAddress: andAddress,
        inputs: [
          encodeProperty({
            predicateAddress: notAddress,
            inputs: [
              encodeProperty({
                predicateAddress: boolAddress,
                inputs: ['0x01']
              })
            ]
          }),
          encodeProperty({
            predicateAddress: boolAddress,
            inputs: ['0x02']
          })
        ]
      }
      await expect(
        mockChallenge.isValidChallenge(orProperty, [], challengeProperty)
      ).to.be.revertedWith('inputs must be same')
    })
    it('fail to challenge or(a, b) with or(not(a), not(b))', async () => {
      const challengeProperty = {
        predicateAddress: orPredicate.address,
        inputs: [
          encodeProperty({
            predicateAddress: notAddress,
            inputs: [
              encodeProperty({
                predicateAddress: boolAddress,
                inputs: ['0x01']
              })
            ]
          }),
          encodeProperty({
            predicateAddress: notAddress,
            inputs: [
              encodeProperty({
                predicateAddress: boolAddress,
                inputs: ['0x02']
              })
            ]
          })
        ]
      }

      await expect(
        mockChallenge.isValidChallenge(orProperty, [], challengeProperty)
      ).to.be.revertedWith('challenge must be And')
    })
  })
})
