import * as MockAdjudicationContract from '../../../build/contracts/MockAdjudicationContract.json'
import * as MockAtomicPredicate from '../../../build/contracts/MockAtomicPredicate.json'
import * as MockCompiledPredicate from '../../../build/contracts/MockCompiledPredicate.json'
import * as Utils from '../../../build/contracts/Utils.json'
import * as ethers from 'ethers'
import { setUpCompiledPredicateTest } from '@cryptoeconomicslab/ovm-ethereum-generator/lib/helper'
import { createOwnershipTestCase } from './OwnershipPredicateTestCase'
import { createStateUpdateTestCase } from './StateUpdatePredicateTestCase'
import { createSwapTestCase } from './SwapPredicateTestCase'
import { TestCaseSet } from '@cryptoeconomicslab/ovm-ethereum-generator/lib/helper'

const createTestCases: (wallet: ethers.Wallet) => TestCaseSet[] = (
  wallet: ethers.Wallet
) => [
  createOwnershipTestCase(wallet),
  createStateUpdateTestCase(wallet),
  createSwapTestCase(wallet)
]

setUpCompiledPredicateTest(
  'predicates',
  createTestCases,
  MockAtomicPredicate,
  MockCompiledPredicate,
  Utils,
  MockAdjudicationContract
)
