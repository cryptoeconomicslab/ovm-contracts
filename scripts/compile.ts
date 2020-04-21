import path from 'path'
import { compileAllSourceFiles } from './compileProperties'

compileAllSourceFiles(
  path.join(__dirname, '../../../contracts/Predicate/plasma')
).then(() => {
  console.log('all compiled')
})
