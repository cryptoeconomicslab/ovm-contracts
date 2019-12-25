import { generateEVMByteCode } from 'ovm-compiler'
import fs from 'fs'
import path from 'path'

compileAllSourceFiles(
  path.join(__dirname, '../../../contracts/Predicate/plasma')
).then(() => {
  console.log('all compiled')
})

async function compileAllSourceFiles(targetDir: string) {
  const files = fs.readdirSync(targetDir)

  await Promise.all(
    files
      .map(f => {
        const ext = path.extname(f)
        if (ext == '.ovm') {
          return compile(
            fs.readFileSync(path.join(targetDir, f)).toString(),
            path.basename(f, ext)
          )
        }
      })
      .filter(p => !!p)
  )
}

async function compile(source: string, contractName: string) {
  const output = await generateEVMByteCode(source)
  fs.writeFileSync(
    path.join(__dirname, `../../../build/contracts/${contractName}.json`),
    output
  )
}
