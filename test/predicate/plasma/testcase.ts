import { ethers } from 'ethers'
import { createOwnershipTestCase } from './OwnershipPredicateTestCase'
import { createStateUpdateTestCase } from './StateUpdatePredicateTestCase'
import { createIncludedAtTestCase } from './IncludedAtPredicateTestCase'
import { OvmProperty } from '../../helpers/utils'

interface ChallengeTestCase {
  name: string
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
  contract: any
  extraArgs: string[]
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
  createIncludedAtTestCase(logicalConnectives, wallet)
]
