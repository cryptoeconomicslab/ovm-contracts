/**
 * This deploy script was modified from https://github.com/plasma-group/pigi/blob/master/packages/unipig/src/contracts/deploy/deploy-rollup-chain.ts
 */
import { ethers, utils } from 'ethers'
import { config } from 'dotenv'
import { resolve } from 'path'
import { link } from 'ethereum-waffle'

import * as CommitmentContract from '../build/contracts/CommitmentContract.json'
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
import * as IsValidSignaturePredicate from '../build/contracts/IsValidSignaturePredicate.json'
import * as IsContainedPredicate from '../build/contracts/IsContainedPredicate.json'
import * as OwnershipPayout from '../build/contracts/OwnershipPayout.json'
import {
  randomAddress,
  encodeAddress,
  encodeString
} from '../test/helpers/utils'
import { compileJSON } from './compileProperties'
import Provider = ethers.providers.Provider
import fs from 'fs'
import path from 'path'
import {
  CompiledPredicate,
  InitilizationConfig
} from './InitializationConfig.js'
const txAddress = encodeAddress(ethers.constants.AddressZero)

if (
  !process.argv.length ||
  process.argv[process.argv.length - 1].endsWith('.js')
) {
  console.log('Error: Environment argument not provided.')
  process.exit(0)
}

const environment = process.argv[process.argv.length - 1]
const envPath = resolve(__dirname, `../../../.${environment}.env`)
if (!fs.existsSync(envPath)) {
  console.log(
    `Error: Environment argument not found. Please do 'cp .env.example .${environment}.env'`
  )
  process.exit(0)
}
config({ path: envPath })

const deployContract = async (
  contractJson: any,
  wallet: ethers.Wallet,
  ...args: any
): Promise<ethers.Contract> => {
  const factory = new ethers.ContractFactory(
    contractJson.abi,
    contractJson.evm.bytecode,
    wallet
  )
  const deployTx = await factory.getDeployTransaction(...args)
  deployTx.gasPrice = 1000_000_000
  const tx = await wallet.sendTransaction(deployTx)
  const address = ethers.utils.getContractAddress(tx)
  console.log(`Address: [${address}], Tx: [${tx.hash}]`)
  await tx.wait()
  return new ethers.Contract(address, factory.interface, factory.signer)
}

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
  utilsAddress: string
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

  // TODO: deploy contracts
  atomicPredicateAddressTable['IsLessThan'] = randomAddress()
  atomicPredicateAddressTable['Equal'] = randomAddress()
  atomicPredicateAddressTable['VerifyInclusion'] = randomAddress()
  atomicPredicateAddressTable['IsSameAmount'] = randomAddress()
  atomicPredicateAddressTable['IsConcatenatedWith'] = randomAddress()
  atomicPredicateAddressTable['IsValidHash'] = randomAddress()
  atomicPredicateAddressTable['IsStored'] = randomAddress()

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
    atomicPredicates['VerifyInclusion'],
    atomicPredicates['IsSameAmount'],
    atomicPredicates['IsConcatenatedWith'],
    atomicPredicates['IsValidHash'],
    atomicPredicates['IsStored'],
    payoutContractAddress
  )
  await tx.wait()
  const propertyData = compileJSON(
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
  commitmentContractAddress: string,
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
    [commitmentContractAddress],
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
    [],
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
  console.log('Deploying CommitmentContract')
  const operatorAddress = process.env.OPERATOR_ADDRESS
  if (operatorAddress === undefined) {
    throw new Error('OPERATOR_ADDRESS not provided.')
  }
  const commitmentContract = await deployContract(
    CommitmentContract,
    wallet,
    operatorAddress
  )
  console.log('CommitmentContract Deployed')

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
    utils.address
  )
  const payoutContracts = await deployPayoutContracts(wallet, utils.address)
  const deployedPredicateTable = await deployCompiledPredicates(
    wallet,
    adjudicationContract.address,
    utils.address,
    commitmentContract.address,
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
    commitmentContract.address,
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
      txAddress: txAddress
    },
    commitmentContract: commitmentContract.address,
    adjudicationContract: adjudicationContract.address,
    payoutContracts: {
      DepositContract: depositContract.address,
      ...payoutContracts
    },
    PlasmaETH: plasmaETH.address
  }
}

const deploy = async (): Promise<void> => {
  console.log(`\n\n********** STARTING DEPLOYMENT ***********\n\n`)
  // Make sure mnemonic exists
  const deployMnemonic = process.env.DEPLOY_MNEMONIC
  if (!deployMnemonic) {
    console.log(
      `Error: No DEPLOY_MNEMONIC env var set. Please add it to .<environment>.env file it and try again. See .env.example for more info.\n`
    )
    return
  }

  // Connect provider
  let provider: Provider
  const network = process.env.DEPLOY_NETWORK
  if (!network || network === 'local') {
    provider = new ethers.providers.JsonRpcProvider(
      process.env.DEPLOY_LOCAL_URL || 'http://127.0.0.1:8545'
    )
  } else {
    provider = ethers.getDefaultProvider(network)
  }

  // Create wallet
  const wallet = ethers.Wallet.fromMnemonic(deployMnemonic).connect(provider)

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
