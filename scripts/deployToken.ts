/**
 * This deploy script was modified from https://github.com/plasma-group/pigi/blob/master/packages/unipig/src/contracts/deploy/deploy-rollup-chain.ts
 */
import { link } from 'ethereum-waffle'
import fs from 'fs'
import path from 'path'

import { getDeployer, deployContract } from './helper'
import { configureEnv } from './configEnv'
import { InitilizationConfig } from './InitializationConfig'

import * as DummyERC20 from '../build/contracts/DummyERC20.json'
import * as DepositContract from '../build/contracts/DepositContract.json'

configureEnv()

async function deployToken() {
  const mnemonic = process.env.DEPLOY_MNEMONIC
  const network = process.env.DEPLOY_NETWORK
  const deployLocalUrl = process.env.DEPLOY_LOCAL_URL

  const wallet = getDeployer(mnemonic, network, deployLocalUrl)

  const config: InitilizationConfig = JSON.parse(
    fs.readFileSync(path.join(__dirname, '../..', 'out.config.json')).toString()
  )

  console.log('Deploy DummyERC20')
  const dummyERC20 = await deployContract(
    DummyERC20,
    wallet,
    'DUM',
    'DummyERC20',
    18
  )
  link(
    DepositContract,
    'contracts/Library/Deserializer.sol:Deserializer',
    config.utils.deserializer
  )
  const depositContractDum = await deployContract(
    DepositContract,
    wallet,
    dummyERC20.address,
    config.commitmentContract,
    config.adjudicationContract,
    config.deployedPredicateTable['StateUpdatePredicate'].deployedAddress,
    config.deployedPredicateTable['ExitPredicate'].deployedAddress,
    config.deployedPredicateTable['ExitDepositPredicate'].deployedAddress
  )

  const result = {
    DummyERC20: {
      TokenContract: dummyERC20.address,
      DepositContract: depositContractDum.address
    }
  }

  console.log('DummyERC20 Deployed')

  // write result
  const outPath = path.join(__dirname, '../../', 'outToken.config.json')
  fs.writeFileSync(outPath, JSON.stringify(result))
}

deployToken()
