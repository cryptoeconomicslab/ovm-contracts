import chai from 'chai'
import {
  createMockProvider,
  deployContract,
  getWallets,
  solidity,
} from 'ethereum-waffle'
import * as EternalStorageContract from '../../build/contracts/EternalStorage.json'
import * as ethers from 'ethers'
import { Bytes } from '@cryptoeconomicslab/primitives'
import { Keccak256 } from '@cryptoeconomicslab/hash'

chai.use(solidity)
chai.use(require('chai-as-promised'))
const { expect } = chai

function validateNotCurrentOwnerError(error: any){
  expect(error).to.be.an.instanceOf(Error)
  expect((error as Error).message).to.include('not current owner')
}

describe('EternalStorage', () => {
  let provider = createMockProvider()
  let wallets = getWallets(provider)
  let wallet = wallets[0]
  let otherWallet1 = wallets[1]
  let otherWallet2 = wallets[2]
  let eternalStorage: any
  let eternalStorageOtherOwner: any
  let key: Bytes

  beforeEach(async () => {
    eternalStorage = await deployContract(wallet, EternalStorageContract)
    eternalStorageOtherOwner = eternalStorage.connect(otherWallet1)
    key = Keccak256.hash(Bytes.fromString('key'))
  })

  describe('EternalStorage; getter,setter,deleter', () => {
    const unsetKey = Keccak256.hash(Bytes.fromString('key'))
		describe('uint', () => {
			it('get.', async () => {
				await eternalStorage.setUint(key, 10)
        		const result = await eternalStorage.getUint(key)
        		expect(result.toNumber()).to.be.equal(10)
			})
			it('delete.', async () => {
				await eternalStorage.deleteUint(key)
				const result = await eternalStorage.getUint(key)
				expect(result.toNumber()).to.be.equal(0)
			})
			it('get initial value.', async () => {
				const result = await eternalStorage.getUint(unsetKey)
				expect(result.toNumber()).to.be.equal(0)
			})
			it('cannot be set to other than the owner.', async () => {
				const result = await eternalStorageOtherOwner
					.setUint(key, 10)
					.catch((err: Error) => err)
        		validateNotCurrentOwnerError(result)
			})
			it('cannot be deleted to other than the owner.', async () => {
				const result = await eternalStorageOtherOwner
					.deleteUint(key)
					.catch((err: Error) => err)
        		validateNotCurrentOwnerError(result)
			})
		})
		describe('byte32', () => {
			let value: string
			beforeEach(async () => {
				value = ethers.utils.formatBytes32String('value')
			})
			it('get.', async () => {
				await eternalStorage.setBytes(key, value)
        		const result = await eternalStorage.getBytes(key)
				expect(result).to.be.equal(value)
			})
			it('delete.', async () => {
				await eternalStorage.deleteBytes(key)
				const result = await eternalStorage.getBytes(key)
				expect(result).to.be.equal(ethers.constants.HashZero)
			})
			it('get initial value.', async () => {
				const result = await eternalStorage.getBytes(unsetKey)
				expect(result).to.be.equal(ethers.constants.HashZero)
			})
			it('cannot be set to other than the owner.', async () => {
				const result = await eternalStorageOtherOwner
					.setBytes(key, value)
					.catch((err: Error) => err)
          		validateNotCurrentOwnerError(result)
			})
			it('cannot be deleted to other than the owner.', async () => {
				const result = await eternalStorageOtherOwner
					.deleteBytes(key)
					.catch((err: Error) => err)
          		validateNotCurrentOwnerError(result)
			})
		})
		describe('string', () => {
			it('get.', async () => {
				await eternalStorage.setString(key, 'test')
				const result = await eternalStorage.getString(key)
				expect(result).to.be.equal('test')
			})
			it('delete.', async () => {
				await eternalStorage.deleteString(key)
				const result = await eternalStorage.getString(key)
				expect(result).to.be.equal('')
			})
			it('get initial value.', async () => {
				const result = await eternalStorage.getString(unsetKey)
				expect(result).to.be.equal('')
			})
			it('cannot be set to other than the owner.', async () => {
				const result = await eternalStorageOtherOwner
					.setString(key, 'test')
					.catch((err: Error) => err)
          		validateNotCurrentOwnerError(result)
			})
			it('cannot be deleted to other than the owner.', async () => {
				const result = await eternalStorageOtherOwner
					.deleteString(key)
					.catch((err: Error) => err)
          		validateNotCurrentOwnerError(result)
			})
		})
		describe('bool', () => {
			it('get.', async () => {
				await eternalStorage.setBool(key, true)
				const result = await eternalStorage.getBool(key)
				expect(result).to.be.equal(true)
			})
			it('delete.', async () => {
				await eternalStorage.deleteBool(key)
				const result = await eternalStorage.getBool(key)
				expect(result).to.be.equal(false)
			})
			it('get initial value.', async () => {
				const result = await eternalStorage.getBool(unsetKey)
				expect(result).to.be.equal(false)
			})
			it('cannot be set to other than the owner.', async () => {
				const result = await eternalStorageOtherOwner
					.setBool(key, true)
					.catch((err: Error) => err)
          		validateNotCurrentOwnerError(result)
			})
			it('cannot be deleted to other than the owner.', async () => {
				const result = await eternalStorageOtherOwner
					.deleteBool(key)
					.catch((err: Error) => err)
          		validateNotCurrentOwnerError(result)
			})
		})
		describe('int', () => {
			it('get.', async () => {
				await eternalStorage.setInt(key, -1)
				const result = await eternalStorage.getInt(key)
				expect(result.toNumber()).to.be.equal(-1)
			})
			it('delete.', async () => {
				await eternalStorage.deleteInt(key)
				const result = await eternalStorage.getInt(key)
				expect(result.toNumber()).to.be.equal(0)
			})
			it('get initial value.', async () => {
				const result = await eternalStorage.getInt(unsetKey)
				expect(result.toNumber()).to.be.equal(0)
			})
			it('cannot be set to other than the owner.', async () => {
				const result = await eternalStorageOtherOwner
					.setInt(key, -1)
					.catch((err: Error) => err)
          		validateNotCurrentOwnerError(result)
			})
			it('cannot be deleted to other than the owner.', async () => {
				const result = await eternalStorageOtherOwner
					.deleteInt(key)
					.catch((err: Error) => err)
          		validateNotCurrentOwnerError(result)
			})
		})
		describe('address', () => {
			it('get.', async () => {
				await eternalStorage.setAddress(key, otherWallet2.address)
				const result = await eternalStorage.getAddress(key)
				expect(result).to.be.equal(otherWallet2.address)
			})
			it('delete.', async () => {
				await eternalStorage.deleteAddress(key)
				const result = await eternalStorage.getAddress(key)
				expect(result).to.be.equal(ethers.constants.AddressZero)
			})
			it('get initial value.', async () => {
				const result = await eternalStorage.getAddress(unsetKey)
				expect(result).to.be.equal(ethers.constants.AddressZero)
			})
			it('cannot be set to other than the owner.', async () => {
				const result = await eternalStorageOtherOwner
					.setAddress(key, otherWallet2.address)
					.catch((err: Error) => err)
          		validateNotCurrentOwnerError(result)
			})
			it('cannot be deleted to other than the owner.', async () => {
				const result = await eternalStorageOtherOwner
					.deleteAddress(key)
					.catch((err: Error) => err)
          		validateNotCurrentOwnerError(result)
			})
		})
	})

})


describe('EternalStorage; upgradeOwner', () => {
  let provider = createMockProvider()
  let wallets = getWallets(provider)
  let wallet = wallets[0]
  let otherWallet1 = wallets[1]
  let otherWallet2 = wallets[2]
  let eternalStorage: any
  let eternalStorageOtherOwner1: any
  let eternalStorageOtherOwner2: any

  let key: Bytes
  beforeEach(async () => {
    eternalStorage = await deployContract(wallet, EternalStorageContract)
    await eternalStorage.changeOwner(otherWallet1.address)
    eternalStorageOtherOwner1 = eternalStorage.connect(otherWallet1)
    key = Keccak256.hash(Bytes.fromString('key'))
    eternalStorageOtherOwner2 = eternalStorage.connect(otherWallet2)
  })
  it('If the owner changes, the owner can change the value.', async () => {
    await eternalStorageOtherOwner1.setUint(key, 1)
    const result = await eternalStorage.getUint(key)
    expect(result.toNumber()).to.be.equal(1)
  })
  it('If the owner changes, the value cannot be changed by the original owner.', async () => {
    const result = await eternalStorage
      .setUint(key, 1)
      .catch((err: Error) => err)
    validateNotCurrentOwnerError(result)
  })
  it('Even if the owner changes, the value cannot be changed from an unrelated address.', async () => {
    const result = await eternalStorageOtherOwner2
      .setUint(key, 1)
      .catch((err: Error) => err)
    validateNotCurrentOwnerError(result)
  })
  it('Even if the owner changes, owner change is not executed.', async () => {
    const result = await eternalStorageOtherOwner2
      .changeOwner(otherWallet2.address)
      .catch((err: Error) => err)
    validateNotCurrentOwnerError(result)
  })
})