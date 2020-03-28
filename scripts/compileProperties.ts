import { compile } from '@cryptoeconomicslab/ovm-ethereum-generator'
import path from 'path'

compile
  .compileAllSourceFiles(
    path.join(__dirname, '../../../contracts/Predicate/plasma'),
    path.join(__dirname, `../../../build/contracts`)
  )
  .then(() => {
    console.log('all compiled')
  })
