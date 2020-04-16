import { generateEVMByteCode } from '@cryptoeconomicslab/ovm-ethereum-generator'
import { generateSolidityCode } from '@cryptoeconomicslab/ovm-solidity-generator'
import { transpile } from '@cryptoeconomicslab/ovm-transpiler'
import { Import, Parser } from '@cryptoeconomicslab/ovm-parser'
import fs from 'fs'
import path from 'path'
import { AbiCoder } from 'ethers/utils'
const abi = new AbiCoder()

compileAllSourceFiles(
  path.join(__dirname, '../../../contracts/Predicate/plasma')
).then(() => {
  console.log('all compiled')
})

async function compileAllSourceFiles(targetDir: string) {
  const files = fs.readdirSync(targetDir)

  await Promise.all(
    files.map(async f => {
      const ext = path.extname(f)
      if (ext == '.ovm') {
        const contractName = path.basename(f, ext)
        const [byteCode, solCode] = await compileToByteCodeAndSolCode(
          targetDir,
          contractName
        )
        fs.writeFileSync(
          path.join(__dirname, `../../../build/contracts/${contractName}.json`),
          byteCode
        )
        fs.writeFileSync(
          path.join(__dirname, `../../../build/contracts/${contractName}.sol`),
          solCode
        )
      }
    })
  )
}

async function compileToByteCodeAndSolCode(
  basePath: string,
  contractName: string
): Promise<[string, string]> {
  const source = fs
    .readFileSync(path.join(basePath, contractName + '.ovm'))
    .toString()

  const importHandler = (_import: Import) => {
    return fs
      .readFileSync(path.join(basePath, _import.path, _import.module + '.ovm'))
      .toString()
  }

  return await Promise.all([
    generateEVMByteCode(source, importHandler),
    generateSolidityCode(source, importHandler)
  ])
}

export function compileJSON(basePath: string, contractName: string) {
  const source = fs
    .readFileSync(path.join(basePath, contractName + '.ovm'))
    .toString()
  const parser = new Parser()
  return transpile(
    parser.parse(source),
    (_import: Import) => {
      const source = fs
        .readFileSync(
          path.join(basePath, _import.path, _import.module + '.ovm')
        )
        .toString()
      return parser.parse(source)
    },
    { zero: abi.encode(['uint256'], [0]) }
  )
}
