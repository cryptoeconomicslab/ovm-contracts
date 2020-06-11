import { config } from 'dotenv'
import { resolve } from 'path'
import fs from 'fs'

export const configureEnv = () => {
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
}
