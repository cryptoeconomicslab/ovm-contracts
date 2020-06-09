import { ethers } from 'ethers'
import Provider = ethers.providers.Provider
import { encodeAddress } from '../test/helpers/utils'

export function getDeployer(
  deployMnemonic?: string,
  deployNetwork: string = 'local',
  deployLocalUrl: string = 'http://127.0.0.1:8545'
) {
  if (!deployMnemonic) {
    throw new Error(
      `Error: No DEPLOY_MNEMONIC env var set. Please add it to .<environment>.env file it and try again. See .env.example for more info.\n`
    )
  }
  // Connect provider
  const provider: Provider =
    deployNetwork === 'local'
      ? new ethers.providers.JsonRpcProvider(deployLocalUrl)
      : ethers.getDefaultProvider(deployNetwork)

  return ethers.Wallet.fromMnemonic(deployMnemonic).connect(provider)
}

export async function deployContract(
  contractJson: any,
  wallet: ethers.Wallet,
  ...args: any
): Promise<ethers.Contract> {
  const factory = new ethers.ContractFactory(
    contractJson.abi,
    contractJson.evm.bytecode,
    wallet
  )
  const deployTx = factory.getDeployTransaction(...args)
  deployTx.gasPrice = 1000_000_000
  const tx = await wallet.sendTransaction(deployTx)
  const address = ethers.utils.getContractAddress(tx)
  console.log(`Address: [${address}], Tx: [${tx.hash}]`)
  await tx.wait()
  return new ethers.Contract(address, factory.interface, factory.signer)
}

export const txAddress = encodeAddress(ethers.constants.AddressZero)
