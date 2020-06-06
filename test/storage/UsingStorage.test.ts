import chai from 'chai'
import {
  createMockProvider,
  deployContract,
  getWallets,
  solidity,
} from 'ethereum-waffle'
import * as UsingStorageTestContract from '../../build/contracts/UsingStorageTest.json'
import { Bytes } from '@cryptoeconomicslab/primitives'

chai.use(solidity)
chai.use(require('chai-as-promised'))
const { expect } = chai

describe('UsingStorage: eternalStorage', () => {
    let provider = createMockProvider()
    let wallets = getWallets(provider)
    let wallet = wallets[0]
    let otherWallet1 = wallets[1]

    it('returns EternalStorage instance', async () => {
        const usingStorageTest = await deployContract(wallet, UsingStorageTestContract)
        await usingStorageTest.createStorage()
        const result = await usingStorageTest.getEternalStorageAddress()
        const expected = await usingStorageTest.getStorageAddress()
        expect(result).to.be.equal(expected)
    })
    it('should fail to returns EternalStorage instance when the contract is pausing', async () => {
        const usingStorageTest = await deployContract(wallet, UsingStorageTestContract)
        await usingStorageTest.createStorage()
        await usingStorageTest.pause()
        const result = await usingStorageTest
            .getEternalStorageAddress()
            .catch((err: Error) => err)
            expect(result).to.be.an.instanceOf(Error)
            expect((result as Error).message).to.include('You cannot use that')
    })
    it('should fail to set to pause when sent from a non-owner account', async () => {
        const usingStorageTest = await deployContract(wallet, UsingStorageTestContract)
        await usingStorageTest.createStorage()
        const usingStorageTestOtherOwner = usingStorageTest.connect(otherWallet1)
        const result = await usingStorageTestOtherOwner
            .pause()
            .catch((err: Error) => err)
            expect(result).to.be.an.instanceOf(Error)
            expect((result as Error).message).to.include('PauserRole: caller does not have the Pauser role')
    })
})

describe('UsingStorage; hasStorage, createStorage', () => {
    let provider = createMockProvider()
    let wallets = getWallets(provider)
    let wallet = wallets[0]
    it('If storage has not been created, an error will occur when trying to get the storage address.', async () => {
        const usingStorageTest = await deployContract(wallet, UsingStorageTestContract)
        const result = await usingStorageTest
            .getStorageAddress()
            .catch((err: Error) => err)
            expect(result).to.be.an.instanceOf(Error)
            expect((result as Error).message).to.include('storage is not setted')
    })
    it('If storage has not been created, an error will occur when accessing storage.', async () => {
        const usingStorageTest = await deployContract(wallet, UsingStorageTestContract)
        const result = await usingStorageTest.getUInt().catch((err: Error) => err)
        expect(result).to.be.an.instanceOf(Error)
        expect((result as Error).message).to.include('storage is not setted')
    })
    it('If the storage has been created, you can access the storage.', async () => {
        const usingStorageTest = await deployContract(wallet, UsingStorageTestContract)
        await usingStorageTest.createStorage()
        const result = await usingStorageTest.getUInt()
        expect(result.toNumber()).to.be.equal(0)
    })
    it('Creating storage again after storage has been created results in an error.', async () => {
        const usingStorageTest = await deployContract(wallet, UsingStorageTestContract)
        await usingStorageTest.createStorage()
        const result = await usingStorageTest
            .createStorage()
            .catch((err: Error) => err)
            expect(result).to.be.an.instanceOf(Error)
            expect((result as Error).message).to.include('storage is setted')
    })
})

describe('UsingStorage; getStorageAddress, setStorage, changeOwner', () => {
    let provider = createMockProvider()
    let wallets = getWallets(provider)
    let wallet = wallets[0]
    let otherWallet1 = wallets[1]
    let usingStorageTest1: any
    let usingStorageTest2: any

    beforeEach(async () => {
        usingStorageTest1 = await deployContract(wallet, UsingStorageTestContract)
        usingStorageTest2 = await deployContract(otherWallet1, UsingStorageTestContract)
        await usingStorageTest1.createStorage()
        await usingStorageTest1.setUInt(1)
    })
    it('Can get the value set in the storage.', async () => {
        const result = await usingStorageTest1.getUInt()
        expect(result.toNumber()).to.be.equal(1)
    })
    it('the storage address is taken over, the same storage can be accessed from the takeover destination.', async () => {
        const storageAddress = await usingStorageTest1.getStorageAddress()
        await usingStorageTest2.setStorage(storageAddress)
        const result = await usingStorageTest2.getUInt()
        expect(result.toNumber()).to.be.equal(1)
    })
    it('Before delegating authority, you can not write.', async () => {
        const storageAddress = await usingStorageTest1.getStorageAddress()
        await usingStorageTest2.setStorage(storageAddress)
        const result = await usingStorageTest2
            .setUInt(2)
            .catch((err: Error) => err)
            expect(result).to.be.an.instanceOf(Error)
            expect((result as Error).message).to.include('not current owner')
    })
    it('Delegation of authority is not possible from the delegate.', async () => {
        const storageAddress = await usingStorageTest1.getStorageAddress()
        await usingStorageTest2.setStorage(storageAddress)
        const result = await usingStorageTest2
            .changeOwner(usingStorageTest2.address)
            .catch((err: Error) => err)
            expect(result).to.be.an.instanceOf(Error)
            expect((result as Error).message).to.include('not current owner')
    })
    it('When delegating authority, the delegate can write to storage', async () => {
        const storageAddress = await usingStorageTest1.getStorageAddress()
        await usingStorageTest2.setStorage(storageAddress)
        await usingStorageTest1.changeOwner(usingStorageTest2.address)
        await usingStorageTest2.setUInt(2)
        const result = await usingStorageTest2.getUInt()
        expect(result.toNumber()).to.be.equal(2)
    })
    it('When delegating authority, delegation source can not write to storage.', async () => {
        const storageAddress = await usingStorageTest1.getStorageAddress()
        await usingStorageTest2.setStorage(storageAddress)
        await usingStorageTest1.changeOwner(usingStorageTest2.address)
        const result = await usingStorageTest1
            .setUInt(2)
            .catch((err: Error) => err)
            expect(result).to.be.an.instanceOf(Error)
            expect((result as Error).message).to.include('not current owner')
    })
})