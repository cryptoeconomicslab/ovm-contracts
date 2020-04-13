/* contract imports */
import chai from 'chai'
import { MockProvider, deployContract, solidity } from 'ethereum-waffle'
import * as MockChallenge from '../build/contracts/MockChallenge.json'
import * as ThereExistsSuchThatQuantifier from '../build/contracts/ThereExistsSuchThatQuantifier.json'
import * as Utils from '../build/contracts/Utils.json'
import * as ethers from 'ethers'
import {
  OvmProperty,
  randomAddress,
  encodeProperty,
  encodeString
} from './helpers/utils'

chai.use(solidity)
chai.use(require('chai-as-promised'))
const { expect, assert } = chai

describe('ThereExistsSuchThatQuantifier', () => {
  let provider = new MockProvider()
  let wallets = provider.getWallets()
  let wallet = wallets[0]
  let thereExistsSuchThatQuantifier: ethers.Contract, utils: ethers.Contract
  const boolAddress = randomAddress()
  const notAddress = randomAddress()
  const andAddress = randomAddress()
  const orAddress = randomAddress()
  const forAddress = randomAddress()
  let mockChallenge: ethers.Contract
  let thereProperty: OvmProperty

  beforeEach(async () => {
    utils = await deployContract(wallet, Utils, [])
    mockChallenge = await deployContract(wallet, MockChallenge, [])
    thereExistsSuchThatQuantifier = await deployContract(
      wallet,
      ThereExistsSuchThatQuantifier,
      [notAddress, andAddress, orAddress, forAddress, utils.address]
    )
    thereProperty = {
      predicateAddress: thereExistsSuchThatQuantifier.address,
      inputs: [
        encodeString(''),
        encodeString('var'),
        encodeProperty({
          predicateAddress: boolAddress,
          inputs: ['0x01']
        })
      ]
    }
  })

  describe('isValidChallenge', () => {
    it('suceed to challenge any(a) with for(not(a))', async () => {
      const challengeProperty = {
        predicateAddress: forAddress,
        inputs: [
          encodeString(''),
          encodeString('var'),
          encodeProperty({
            predicateAddress: notAddress,
            inputs: [
              encodeProperty({
                predicateAddress: boolAddress,
                inputs: ['0x01']
              })
            ]
          })
        ]
      }
      const result = await mockChallenge.isValidChallenge(
        thereProperty,
        [],
        challengeProperty
      )
      assert.isTrue(result)
    })
    it('fail to challenge with invalid variable', async () => {
      const challengeProperty = {
        predicateAddress: forAddress,
        inputs: [
          encodeString(''),
          encodeString('invalid'),
          encodeProperty({
            predicateAddress: notAddress,
            inputs: [
              encodeProperty({
                predicateAddress: boolAddress,
                inputs: ['0x01']
              })
            ]
          })
        ]
      }
      await expect(
        mockChallenge.isValidChallenge(thereProperty, [], challengeProperty)
      ).to.be.revertedWith('variable must be same')
    })
    it('fail to challenge with invalid property', async () => {
      const challengeProperty = {
        predicateAddress: forAddress,
        inputs: [
          encodeString(''),
          encodeString('var'),
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
        mockChallenge.isValidChallenge(thereProperty, [], challengeProperty)
      ).to.be.revertedWith('inputs must be same')
    })
  })
})
