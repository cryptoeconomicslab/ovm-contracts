import { generateEVMByteCode } from 'ovm-compiler'
import fs from 'fs'
import path from 'path'

compileAllSourceFiles(
  path.join(__dirname, '../../../contracts/Predicate/generated')
)
function compileAllSourceFiles(targetDir: string) {
  const files = fs.readdirSync(targetDir)

  files.forEach(f => {
    const ext = path.extname(f)
    if (ext == '.ovm') {
      compile(
        fs.readFileSync(path.join(targetDir, f)).toString(),
        path.basename(f, ext)
      )
    }
  })
}
function compile(source: string, contractName: string) {
  const output = generateEVMByteCode(source)
  fs.writeFileSync(
    path.join(__dirname, `../../../build/contracts/${contractName}.json`),
    output
  )
}
