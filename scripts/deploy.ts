/**
 * This deploy script was modified from https://github.com/plasma-group/pigi/blob/master/packages/unipig/src/contracts/deploy/deploy-rollup-chain.ts
 */
import { ethers, utils } from 'ethers'
import { link } from 'ethereum-waffle'

import * as Commitment from '../build/contracts/Commitment.json'
import * as Verify from '../build/contracts/Verify.json'
import * as Deserializer from '../build/contracts/Deserializer.json'
import * as ECRecover from '../build/contracts/ECRecover.json'
import * as UniversalAdjudicationContract from '../build/contracts/UniversalAdjudicationContract.json'
import * as DepositContract from '../build/contracts/DepositContract.json'
import * as Utils from '../build/contracts/Utils.json'
import * as PlasmaETH from '../build/contracts/PlasmaETH.json'
import * as AndPredicate from '../build/contracts/AndPredicate.json'
import * as NotPredicate from '../build/contracts/NotPredicate.json'
import * as ForAllSuchThatQuantifier from '../build/contracts/ForAllSuchThatQuantifier.json'
import * as OrPredicate from '../build/contracts/OrPredicate.json'
import * as ThereExistsSuchThatQuantifier from '../build/contracts/ThereExistsSuchThatQuantifier.json'
import * as EqualPredicate from '../build/contracts/EqualPredicate.json'
import * as IsLessThanPredicate from '../build/contracts/IsLessThanPredicate.json'
import * as IsStoredPredicate from '../build/contracts/IsStoredPredicate.json'
import * as IsValidSignaturePredicate from '../build/contracts/IsValidSignaturePredicate.json'
import * as IsContainedPredicate from '../build/contracts/IsContainedPredicate.json'
import * as HasIntersectionPredicate from '../build/contracts/HasIntersectionPredicate.json'
import * as VerifyInclusionPredicate from '../build/contracts/VerifyInclusionPredicate.json'
import * as OwnershipPayout from '../build/contracts/OwnershipPayout.json'
import {
  randomAddress,
  encodeAddress,
  encodeString
} from '../test/helpers/utils'
import { compile } from '@cryptoeconomicslab/ovm-ethereum-generator'
import fs from 'fs'
import path from 'path'
import {
  CompiledPredicate,
  InitilizationConfig
} from './InitializationConfig.js'
import { getDeployer, deployContract, txAddress } from './helper'
import { configureEnv } from './configEnv'
configureEnv()

const deployLogicalConnective = async (
  wallet: ethers.Wallet,
  uacAddress: string,
  utilsAddress: string
): Promise<{ [key: string]: string }> => {
  const logicalConnectiveAddressTable: { [key: string]: string } = {}
  console.log('Deploying NotPredicate')
  const notPredicate = await deployContract(
    NotPredicate,
    wallet,
    uacAddress,
    utilsAddress
  )
  logicalConnectiveAddressTable['Not'] = notPredicate.address
  console.log('NotPredicate Deployed')

  console.log('Deploying AndPredicate')
  const andPredicate = await deployContract(
    AndPredicate,
    wallet,
    uacAddress,
    notPredicate.address,
    utilsAddress
  )
  logicalConnectiveAddressTable['And'] = andPredicate.address
  console.log('AndPredicate Deployed')

  console.log('Deploying ForAllSuchThatPredicate')
  const forAllSuchThatQuantifier = await deployContract(
    ForAllSuchThatQuantifier,
    wallet,
    uacAddress,
    notPredicate.address,
    andPredicate.address,
    utilsAddress
  )
  logicalConnectiveAddressTable['ForAllSuchThat'] =
    forAllSuchThatQuantifier.address
  console.log('ForAllSuchThatPredicate Deployed')

  console.log('Deploying OrPredicate')
  const orPredicate = await deployContract(
    OrPredicate,
    wallet,
    notPredicate.address,
    andPredicate.address
  )
  logicalConnectiveAddressTable['Or'] = orPredicate.address
  console.log('OrPredicate Deployed')

  console.log('Deploying ThereExistsSuchThatQuantifier')
  const thereExistsSuchThatQuantifier = await deployContract(
    ThereExistsSuchThatQuantifier,
    wallet,
    notPredicate.address,
    andPredicate.address,
    orPredicate.address,
    forAllSuchThatQuantifier.address,
    utilsAddress
  )
  logicalConnectiveAddressTable['ThereExistsSuchThat'] =
    thereExistsSuchThatQuantifier.address
  console.log('ThereExistsSuchThatQuantifier Deployed')

  return logicalConnectiveAddressTable
}

const deployAtomicPredicates = async (
  wallet: ethers.Wallet,
  uacAddress: string,
  utilsAddress: string,
  commitmentAddress: string
): Promise<{ [key: string]: string }> => {
  const atomicPredicateAddressTable: { [key: string]: string } = {}

  console.log('Deploying IsValidSignaturePredicate')
  const isValidSignaturePredicate = await deployContract(
    IsValidSignaturePredicate,
    wallet,
    uacAddress,
    utilsAddress
  )
  atomicPredicateAddressTable['IsValidSignature'] =
    isValidSignaturePredicate.address
  console.log('IsValidSignaturePredicate Deployed')

  console.log('Deploying IsContainedPredicate')
  const isContainedPredicate = await deployContract(
    IsContainedPredicate,
    wallet,
    uacAddress,
    utilsAddress
  )
  atomicPredicateAddressTable['IsContained'] = isContainedPredicate.address
  console.log('IsContainedPredicate Deployed')
  const equalPredicate = await deployContract(
    EqualPredicate,
    wallet,
    uacAddress,
    utilsAddress
  )
  const isLessThanPredicate = await deployContract(
    IsLessThanPredicate,
    wallet,
    uacAddress,
    utilsAddress
  )
  const isStoredPredicate = await deployContract(
    IsStoredPredicate,
    wallet,
    uacAddress,
    utilsAddress
  )
  const verifyInclusion = await deployContract(
    VerifyInclusionPredicate,
    wallet,
    uacAddress,
    utilsAddress,
    commitmentAddress
  )
  const hasIntersectionPredicate = await deployContract(
    HasIntersectionPredicate,
    wallet,
    uacAddress,
    utilsAddress
  )

  // TODO: deploy contracts
  atomicPredicateAddressTable['IsLessThan'] = isLessThanPredicate.address
  atomicPredicateAddressTable['Equal'] = equalPredicate.address
  atomicPredicateAddressTable['VerifyInclusion'] = verifyInclusion.address
  atomicPredicateAddressTable['IsSameAmount'] = randomAddress()
  atomicPredicateAddressTable['IsConcatenatedWith'] = randomAddress()
  atomicPredicateAddressTable['IsValidHash'] = randomAddress()
  atomicPredicateAddressTable['IsStored'] = isStoredPredicate.address
  atomicPredicateAddressTable['HasIntersection'] =
    hasIntersectionPredicate.address

  return atomicPredicateAddressTable
}

const deployPayoutContracts = async (
  wallet: ethers.Wallet,
  utilsAddress: string
): Promise<{ [key: string]: string }> => {
  const payoutContractAddressTable: { [key: string]: string } = {}

  console.log('Deploying OwnershipPayout')
  const ownershipPayout = await deployContract(
    OwnershipPayout,
    wallet,
    utilsAddress
  )
  payoutContractAddressTable['OwnershipPayout'] = ownershipPayout.address
  console.log('OwnershipPayout Deployed')

  return payoutContractAddressTable
}

const deployOneCompiledPredicate = async (
  name: string,
  extraArgs: string[],
  wallet: ethers.Wallet,
  uacAddress: string,
  utilsAddress: string,
  payoutContractAddress: string,
  logicalConnectives: { [key: string]: string },
  atomicPredicates: { [key: string]: string }
): Promise<CompiledPredicate> => {
  console.log(`Deploying ${name}`)
  const compiledPredicateJson = JSON.parse(
    fs
      .readFileSync(path.join(__dirname, `../../contracts/${name}.json`))
      .toString()
  )

  const compiledPredicates = await deployContract(
    compiledPredicateJson,
    wallet,
    uacAddress,
    utilsAddress,
    logicalConnectives['Not'],
    logicalConnectives['And'],
    logicalConnectives['ForAllSuchThat'],
    ...extraArgs
  )
  const tx = await compiledPredicates.setPredicateAddresses(
    atomicPredicates['IsLessThan'],
    atomicPredicates['Equal'],
    atomicPredicates['IsValidSignature'],
    atomicPredicates['IsContained'],
    atomicPredicates['HasIntersection'],
    atomicPredicates['VerifyInclusion'],
    atomicPredicates['IsSameAmount'],
    atomicPredicates['IsConcatenatedWith'],
    atomicPredicates['IsValidHash'],
    atomicPredicates['IsStored'],
    payoutContractAddress
  )
  await tx.wait()
  const propertyData = compile.compileJSON(
    path.join(__dirname, `../../../contracts/Predicate/plasma`),
    name
  )

  console.log(`${name} Deployed`)

  return {
    deployedAddress: compiledPredicates.address,
    source: propertyData
  }
}

const deployCompiledPredicates = async (
  wallet: ethers.Wallet,
  uacAddress: string,
  utilsAddress: string,
  commitmentAddress: string,
  logicalConnectives: { [key: string]: string },
  atomicPredicates: { [key: string]: string },
  payoutContracts: { [key: string]: string }
): Promise<{ [key: string]: CompiledPredicate }> => {
  const deployedPredicateTable: { [key: string]: CompiledPredicate } = {}

  const stateUpdatePredicate = await deployOneCompiledPredicate(
    'StateUpdatePredicate',
    [txAddress],
    wallet,
    uacAddress,
    utilsAddress,
    ethers.constants.AddressZero,
    logicalConnectives,
    atomicPredicates
  )
  deployedPredicateTable['StateUpdatePredicate'] = stateUpdatePredicate

  const ownershipPredicate = await deployOneCompiledPredicate(
    'OwnershipPredicate',
    [utils.hexlify(utils.toUtf8Bytes('secp256k1'))],
    wallet,
    uacAddress,
    utilsAddress,
    payoutContracts['OwnershipPayout'],
    logicalConnectives,
    atomicPredicates
  )
  deployedPredicateTable['OwnershipPredicate'] = ownershipPredicate

  const checkpointPredicate = await deployOneCompiledPredicate(
    'CheckpointPredicate',
    [encodeAddress(commitmentAddress)],
    wallet,
    uacAddress,
    utilsAddress,
    ethers.constants.AddressZero,
    logicalConnectives,
    atomicPredicates
  )
  deployedPredicateTable['CheckpointPredicate'] = checkpointPredicate

  const exitPredicate = await deployOneCompiledPredicate(
    'ExitPredicate',
    [checkpointPredicate.deployedAddress],
    wallet,
    uacAddress,
    utilsAddress,
    ethers.constants.AddressZero,
    logicalConnectives,
    atomicPredicates
  )
  deployedPredicateTable['ExitPredicate'] = exitPredicate

  const depositExitPredicate = await deployOneCompiledPredicate(
    'ExitDepositPredicate',
    [],
    wallet,
    uacAddress,
    utilsAddress,
    ethers.constants.AddressZero,
    logicalConnectives,
    atomicPredicates
  )
  deployedPredicateTable['ExitDepositPredicate'] = depositExitPredicate

  return deployedPredicateTable
}

const deployContracts = async (
  wallet: ethers.Wallet
): Promise<InitilizationConfig> => {
  console.log('Deploying Commitment')
  const operatorAddress = process.env.OPERATOR_ADDRESS
  if (operatorAddress === undefined) {
    throw new Error('OPERATOR_ADDRESS not provided.')
  }
  const commitment = await deployContract(
    Commitment,
    wallet,
    operatorAddress
  )
  console.log('Commitment Deployed')

  const verify = await deployContract(
    Verify,
    wallet,
    commitment.address
  )
  console.log('VerifyCommitmentData Deployed')

  console.log('Deploying Utils')
  const utils = await deployContract(Utils, wallet)
  console.log('Utils Deployed')

  console.log('Deploying Deserializer')
  const deserializer = await deployContract(Deserializer, wallet)
  console.log('Deserializer Deployed')

  console.log('Deploying ECRecover')
  const ecrecover = await deployContract(ECRecover, wallet)
  link(
    IsValidSignaturePredicate,
    'contracts/Library/ECRecover.sol:ECRecover',
    ecrecover.address
  )

  console.log('ECRecover Deployed')

  console.log('Deploying UniversalAdjudicationContract')
  const adjudicationContract = await deployContract(
    UniversalAdjudicationContract,
    wallet,
    utils.address
  )
  console.log('UniversalAdjudicationContract Deployed')

  const logicalConnectives = await deployLogicalConnective(
    wallet,
    adjudicationContract.address,
    utils.address
  )
  const atomicPredicates = await deployAtomicPredicates(
    wallet,
    adjudicationContract.address,
    utils.address,
    commitment.address
  )
  const payoutContracts = await deployPayoutContracts(wallet, utils.address)
  const deployedPredicateTable = await deployCompiledPredicates(
    wallet,
    adjudicationContract.address,
    utils.address,
    commitment.address,
    logicalConnectives,
    atomicPredicates,
    payoutContracts
  )

  console.log('Deploying PlasmaETH')
  const plasmaETH = await deployContract(
    PlasmaETH,
    wallet,
    'PETH',
    'PlasmaETH',
    18 // decimals
  )
  console.log('PlasmaETH Deployed')

  console.log('Deploying DepositContract')
  link(
    DepositContract,
    'contracts/Library/Deserializer.sol:Deserializer',
    deserializer.address
  )
  const depositContract = await deployContract(
    DepositContract,
    wallet,
    plasmaETH.address,
    commitment.address,
    adjudicationContract.address,
    deployedPredicateTable['StateUpdatePredicate'].deployedAddress,
    deployedPredicateTable['ExitPredicate'].deployedAddress,
    deployedPredicateTable['ExitDepositPredicate'].deployedAddress
  )
  console.log('DepositContract Deployed')

  return {
    logicalConnectiveAddressTable: logicalConnectives,
    atomicPredicateAddressTable: atomicPredicates,
    deployedPredicateTable: deployedPredicateTable,
    constantVariableTable: {
      secp256k1: encodeString('secp256k1'),
      txAddress: txAddress,
      verify: encodeAddress(verify.address)
    },
    commitment: commitment.address,
    adjudicationContract: adjudicationContract.address,
    payoutContracts: {
      DepositContract: depositContract.address,
      ...payoutContracts
    },
    PlasmaETH: plasmaETH.address,
    utils: {
      utils: utils.address,
      deserializer: deserializer.address,
      ecrecover: ecrecover.address
    }
  }
}

const deploy = async (): Promise<void> => {
  console.log(`\n\n********** STARTING DEPLOYMENT ***********\n\n`)
  const mnemonic = process.env.DEPLOY_MNEMONIC
  const network = process.env.DEPLOY_NETWORK
  const deployLocalUrl = process.env.DEPLOY_LOCAL_URL
  const wallet = getDeployer(mnemonic, network, deployLocalUrl)

  console.log(`Deploying to network [${network || 'local'}] in 5 seconds!`)
  setTimeout(async () => {
    const config = await deployContracts(wallet)
    console.log('initialization config JSON file')
    console.log(config)
    const outPath = path.join(__dirname, '../..', 'out.config.json')
    console.log('write config into ', outPath)
    fs.writeFileSync(outPath, JSON.stringify(config))
  }, 5_000)
}

deploy()
