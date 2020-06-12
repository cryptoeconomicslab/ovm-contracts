import chai from 'chai'
import {
  createMockProvider,
  deployContract,
  getWallets,
  solidity,
} from 'ethereum-waffle'
import * as DepositStorageContract from '../build/contracts/DepositStorage.json'
import * as ethers from 'ethers'

chai.use(solidity)
chai.use(require('chai-as-promised'))
const { expect } = chai

function validateNotDepositContractError(error: any){
    expect(error).to.be.an.instanceOf(Error)
    expect((error as Error).message).to.include('deposit only')
}

describe.only('DepositStorage', () => {
    const provider = createMockProvider()
    const wallets = getWallets(provider)
    const wallet = wallets[0]
    const depositContract = wallets[1]
    const valueAddress = wallets[2].address
    let depositStorageOwner: any
    let depositStorage: any

    beforeEach(async () => {
        depositStorageOwner = await deployContract(wallet, DepositStorageContract, [], { gasLimit: 6000000 })
        await depositStorageOwner.createStorage();
        await depositStorageOwner.setDepositAddress(depositContract.address)
        depositStorage = depositStorageOwner.connect(depositContract)
    })

    describe('DepositStorage; getter,setter,deleter', () => {
	    describe('erc20', () => {
		    it('get initial value.', async () => {
			    const result = await depositStorage.getErc20()
			    expect(result).to.be.equal(ethers.constants.AddressZero)
		    })
            it('get.', async () => {
			    await depositStorage.setErc20(valueAddress)
			    const result = await depositStorage.getErc20()
			    expect(result).to.be.equal(valueAddress)
		    })
		    it('cannot be set to other than the owner.', async () => {
			    const result = await depositStorageOwner
				    .setErc20(valueAddress)
				    .catch((err: Error) => err)
                validateNotDepositContractError(result)
		    })
        })
        describe('commitment', () => {
		    it('get initial value.', async () => {
			    const result = await depositStorage.getCommitment()
			    expect(result).to.be.equal(ethers.constants.AddressZero)
		    })
            it('get.', async () => {
			    await depositStorage.setCommitment(valueAddress)
			    const result = await depositStorage.getCommitment()
			    expect(result).to.be.equal(valueAddress)
		    })
		    it('cannot be set to other than the owner.', async () => {
			    const result = await depositStorageOwner
				    .setCommitment(valueAddress)
				    .catch((err: Error) => err)
                validateNotDepositContractError(result)
		    })
        })
        describe('universalAdjudication', () => {
		    it('get initial value.', async () => {
			    const result = await depositStorage.getUniversalAdjudication()
			    expect(result).to.be.equal(ethers.constants.AddressZero)
		    })
            it('get.', async () => {
			    await depositStorage.setUniversalAdjudication(valueAddress)
			    const result = await depositStorage.getUniversalAdjudication()
			    expect(result).to.be.equal(valueAddress)
		    })
		    it('cannot be set to other than the owner.', async () => {
			    const result = await depositStorageOwner
				    .setUniversalAdjudication(valueAddress)
				    .catch((err: Error) => err)
                validateNotDepositContractError(result)
		    })
	    })
    })
})
