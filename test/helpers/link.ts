import { deployContract, link } from 'ethereum-waffle'
import * as BatchExitDispute from '../../build/contracts/BatchExitDispute.json'
import * as Deserializer from '../../build/contracts/Deserializer.json'
import { Wallet } from 'ethers'

export async function linkDeserializer(wallet: Wallet) {
  const deserializer = await deployContract(wallet, Deserializer, [])
  try {
    link(
      BatchExitDispute,
      'contracts/Library/Deserializer.sol:Deserializer',
      deserializer.address
    )
  } catch (e) {
    // link fail in second time.
  }
}
