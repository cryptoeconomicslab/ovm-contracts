import { compile } from '@cryptoeconomicslab/ovm-ethereum-generator'
import path from 'path'
import { AbiCoder } from 'ethers/utils'
const abi = new AbiCoder()

compile.compileAllSourceFiles(
  path.join(__dirname, '../../../contracts/Predicate/plasma'),
  path.join(__dirname, `../../../build/contracts`),
  {
    optimizer: { enabled: true }
  }
)
