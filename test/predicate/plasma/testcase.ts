import { ethers } from 'ethers'
import { createOwnershipTestCase } from './OwnershipPredicateTestCase'
import { createStateUpdateTestCase } from './StateUpdatePredicateTestCase'
import { OvmProperty } from '../../helpers/utils'
import { createSwapTestCase } from './SwapPredicateTestCase'

interface ChallengeTestCase {
  name: string
  challengeInput?: string
  getProperty: (
    ownershipPredicate: ethers.Contract,
    compiledPredicate: ethers.Contract
  ) => OvmProperty
  getChallenge: (
    ownershipPredicate: ethers.Contract,
    mockAtomicPredicateAddress: string,
    compiledPredicate: ethers.Contract
  ) => OvmProperty
}

interface DecideTestCase {
  name: string
  createParameters: (
    compiledPredicate: ethers.Contract
  ) => { inputs: string[]; witnesses: string[] }
}

interface TestCase {
  name: string
  deploy: {
    contract: any
    getExtraArgs: (
      mockAtomicPredicate: ethers.Contract,
      deployed: ethers.Contract[]
    ) => string[]
  }[]
  validChallenges: ChallengeTestCase[]
  invalidChallenges: ChallengeTestCase[]
  decideTrueTestCases: DecideTestCase[]
  invalidDecideTestCases: DecideTestCase[]
}

export const createTestCases: (
  logicalConnectives: string[],
  wallet: ethers.Wallet
) => TestCase[] = (logicalConnectives: string[], wallet: ethers.Wallet) => [
  createOwnershipTestCase(logicalConnectives, wallet),
  createStateUpdateTestCase(logicalConnectives, wallet),
  createSwapTestCase(logicalConnectives, wallet)
]
