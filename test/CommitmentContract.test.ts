import chai from 'chai'
import {
  createMockProvider,
  deployContract,
  getWallets,
  solidity
} from 'ethereum-waffle'
import * as CommitmentContract from '../build/contracts/CommitmentContract.json'
import * as ethers from 'ethers'
import { Bytes } from '@cryptoeconomicslab/primitives'
import { Keccak256 } from '@cryptoeconomicslab/hash'
import { AbiCoder } from 'ethers/utils'

chai.use(solidity)
chai.use(require('chai-as-promised'))
const { expect, assert } = chai

describe('CommitmentContract', () => {
  let provider = createMockProvider()
  let wallets = getWallets(provider)
  let wallet = wallets[0]
  let commitmentContract: any
  const root = ethers.utils.keccak256(
    ethers.utils.arrayify(ethers.constants.HashZero)
  )

  beforeEach(async () => {
    commitmentContract = await deployContract(wallet, CommitmentContract, [
      wallet.address
    ])
  })

  describe('submitRoot', () => {
    it('succeed to submit root', async () => {
      await expect(commitmentContract.submitRoot(1, root)).to.emit(
        commitmentContract,
        'BlockSubmitted'
      )
    })
    it('fail to submit root because of unregistered operator address', async () => {
      const commitmentContractFromOtherWallet = commitmentContract.connect(
        wallets[1]
      )
      await expect(commitmentContractFromOtherWallet.submitRoot(1, root)).to.be
        .reverted
    })
    it('fail to submit root because of invalid block number', async () => {
      await expect(commitmentContract.submitRoot(0, root)).to.be.reverted
    })
  })

  describe('retrieve', () => {
    it('succeed to retrieve root with block', async () => {
      const abi = new AbiCoder()
      await commitmentContract.submitRoot(1, root)
      const retrieved = await commitmentContract.retrieve(
        abi.encode(['uint256'], [1])
      )
      expect(retrieved).to.equals(root)
    })
  })

  describe('verifyInclusion', () => {
    /*
     * Tree for test case
     *         root
     *         / \
     *    root0   root1
     *    / \
     *  / \ / \   /   \
     * 0  1 2  3 1-0 1-1
     */
    const tokenAddress = ethers.constants.AddressZero
    const leaf0 = {
      data: Keccak256.hash(Bytes.fromString('leaf0')),
      start: 0,
      address: tokenAddress
    }
    const leaf1 = {
      data: Keccak256.hash(Bytes.fromString('leaf1')),
      start: 7,
      address: tokenAddress
    }
    const leaf2 = {
      data: Keccak256.hash(Bytes.fromString('leaf2')),
      start: 15,
      address: tokenAddress
    }
    const leaf3 = {
      data: Keccak256.hash(Bytes.fromString('leaf3')),
      start: 5000,
      address: tokenAddress
    }
    const blockNumber = 1
    const root =
      '0x1aa3429d5aa7bf693f3879fdfe0f1a979a4b49eaeca9638fea07ad7ee5f0b64f'
    const validInclusionProof = {
      addressInclusionProof: {
        leafPosition: 0,
        leafIndex: '0x0000000000000000000000000000000000000000',
        siblings: [
          {
            tokenAddress: '0x0000000000000000000000000000000000000001',
            data:
              '0xdd779be20b84ced84b7cbbdc8dc98d901ecd198642313d35d32775d75d916d3a'
          }
        ]
      },
      intervalInclusionProof: {
        leafPosition: 0,
        leafIndex: 0,
        siblings: [
          {
            start: 7,
            data:
              '0x036491cc10808eeb0ff717314df6f19ba2e232d04d5f039f6fa382cae41641da'
          },
          {
            start: 5000,
            data:
              '0xef583c07cae62e3a002a9ad558064ae80db17162801132f9327e8bb6da16ea8a'
          }
        ]
      }
    }

    beforeEach(async () => {
      await commitmentContract.submitRoot(blockNumber, root)
    })

    it('suceed to verify inclusion of the most left leaf', async () => {
      const result = await commitmentContract.verifyInclusion(
        leaf0.data,
        tokenAddress,
        { start: 0, end: 5 },
        validInclusionProof,
        blockNumber
      )
      expect(result).to.be.true
    })

    it('suceed to verify inclusion 1', async () => {
      // inclusion proof of node 1
      const inclusionProofOfNode1 = {
        addressInclusionProof: {
          leafPosition: 0,
          leafIndex: '0x0000000000000000000000000000000000000000',
          siblings: [
            {
              tokenAddress: '0x0000000000000000000000000000000000000001',
              data:
                '0xdd779be20b84ced84b7cbbdc8dc98d901ecd198642313d35d32775d75d916d3a'
            }
          ]
        },
        intervalInclusionProof: {
          leafPosition: 1,
          leafIndex: 7,
          siblings: [
            {
              start: 0,
              data:
                '0x6fef85753a1881775100d9b0a36fd6c333db4e7f358b8413d3819b6246b66a30'
            },
            {
              start: 5000,
              data:
                '0xef583c07cae62e3a002a9ad558064ae80db17162801132f9327e8bb6da16ea8a'
            }
          ]
        }
      }
      const result = await commitmentContract.verifyInclusion(
        leaf1.data,
        tokenAddress,
        { start: 7, end: 10 },
        inclusionProofOfNode1,
        blockNumber
      )
      expect(result).to.be.true
    })

    it('suceed to verify inclusion 2', async () => {
      // inclusion proof of node 2
      const inclusionProofOfNode2 = {
        addressInclusionProof: {
          leafPosition: 0,
          leafIndex: '0x0000000000000000000000000000000000000000',
          siblings: [
            {
              tokenAddress: '0x0000000000000000000000000000000000000001',
              data:
                '0xdd779be20b84ced84b7cbbdc8dc98d901ecd198642313d35d32775d75d916d3a'
            }
          ]
        },
        intervalInclusionProof: {
          leafPosition: 2,
          leafIndex: 15,
          siblings: [
            {
              start: 5000,
              data:
                '0xfdd1f2a1ec75fe968421a41d2282200de6bec6a21f81080a71b1053d9c0120f3'
            },
            {
              start: 7,
              data:
                '0x59a76952828fd54de12b708bf0030e055ae148c0a5a7d8b4f191d519275337e8'
            }
          ]
        }
      }
      const result = await commitmentContract.verifyInclusion(
        leaf2.data,
        tokenAddress,
        { start: 15, end: 500 },
        inclusionProofOfNode2,
        blockNumber
      )
      expect(result).to.be.true
    })

    it('suceed to verify inclusion 3', async () => {
      // inclusion proof of node 3
      const inclusionProofOfNode3 = {
        addressInclusionProof: {
          leafPosition: 0,
          leafIndex: '0x0000000000000000000000000000000000000000',
          siblings: [
            {
              tokenAddress: '0x0000000000000000000000000000000000000001',
              data:
                '0xdd779be20b84ced84b7cbbdc8dc98d901ecd198642313d35d32775d75d916d3a'
            }
          ]
        },
        intervalInclusionProof: {
          leafPosition: 3,
          leafIndex: 5000,
          siblings: [
            {
              start: 15,
              data:
                '0xba620d61dac4ddf2d7905722b259b0bd34ec4d37c5796d9a22537c54b3f972d8'
            },
            {
              start: 7,
              data:
                '0x59a76952828fd54de12b708bf0030e055ae148c0a5a7d8b4f191d519275337e8'
            }
          ]
        }
      }
      const result = await commitmentContract.verifyInclusion(
        leaf3.data,
        tokenAddress,
        { start: 5000, end: 5010 },
        inclusionProofOfNode3,
        blockNumber
      )
      expect(result).to.be.true
    })

    it('fail to verify inclusion because of invalid range', async () => {
      await expect(
        commitmentContract.verifyInclusion(
          leaf0.data,
          tokenAddress,
          { start: 10, end: 20 },
          validInclusionProof,
          blockNumber
        )
      ).to.be.revertedWith('required range must not exceed the implicit range')
    })

    it('fail to verify inclusion because of end exceeded', async () => {
      await expect(
        commitmentContract.verifyInclusion(
          leaf0.data,
          tokenAddress,
          { start: 0, end: 20 },
          validInclusionProof,
          blockNumber
        )
      ).to.be.revertedWith('required range must not exceed the implicit range')
    })

    it('fail to verify inclusion because of invalid hash data', async () => {
      const result = await commitmentContract.verifyInclusion(
        leaf1.data,
        tokenAddress,
        { start: 0, end: 5 },
        validInclusionProof,
        blockNumber
      )
      expect(result).to.be.false
    })

    it('fail to verify inclusion because of intersection', async () => {
      const invalidInclusionProof = {
        addressInclusionProof: {
          leafPosition: 0,
          leafIndex: '0x0000000000000000000000000000000000000000',
          siblings: [
            {
              tokenAddress: '0x0000000000000000000000000000000000000001',
              data:
                '0xdd779be20b84ced84b7cbbdc8dc98d901ecd198642313d35d32775d75d916d3a'
            }
          ]
        },
        intervalInclusionProof: {
          leafPosition: 0,
          leafIndex: 0,
          siblings: [
            {
              start: 7,
              data:
                '0x036491cc10808eeb0ff717314df6f19ba2e232d04d5f039f6fa382cae41641da'
            },
            {
              start: 0,
              data:
                '0xef583c07cae62e3a002a9ad558064ae80db17162801132f9327e8bb6da16ea8a'
            }
          ]
        }
      }

      await expect(
        commitmentContract.verifyInclusion(
          leaf0.data,
          tokenAddress,
          { start: 0, end: 5 },
          invalidInclusionProof,
          blockNumber
        )
      ).to.be.revertedWith(
        'firstRightSiblingStart must be greater than siblingStart'
      )
    })

    it('fail to verify inclusion because of left.start is not less than right.start', async () => {
      const invalidInclusionProof = {
        addressInclusionProof: {
          leafPosition: 0,
          leafIndex: '0x0000000000000000000000000000000000000000',
          siblings: [
            {
              tokenAddress: '0x0000000000000000000000000000000000000001',
              data:
                '0xdd779be20b84ced84b7cbbdc8dc98d901ecd198642313d35d32775d75d916d3a'
            }
          ]
        },
        intervalInclusionProof: {
          leafPosition: 1,
          leafIndex: 7,
          siblings: [
            {
              start: 0,
              data:
                '0x6fef85753a1881775100d9b0a36fd6c333db4e7f358b8413d3819b6246b66a30'
            },
            {
              start: 0,
              data:
                '0xef583c07cae62e3a002a9ad558064ae80db17162801132f9327e8bb6da16ea8a'
            }
          ]
        }
      }
      await expect(
        commitmentContract.verifyInclusion(
          leaf1.data,
          tokenAddress,
          { start: 7, end: 15 },
          invalidInclusionProof,
          blockNumber
        )
      ).to.be.revertedWith('_leftStart must be less than _rightStart')
    })

    it('fail to verify inclusion because of address', async () => {
      const invalidInclusionProof = {
        addressInclusionProof: {
          leafPosition: 0,
          leafIndex: '0x0000000000000000000000000000000000000001',
          siblings: [
            {
              tokenAddress: '0x0000000000000000000000000000000000000001',
              data:
                '0xdd779be20b84ced84b7cbbdc8dc98d901ecd198642313d35d32775d75d916d3a'
            }
          ]
        },
        intervalInclusionProof: {
          leafPosition: 3,
          leafIndex: 5000,
          siblings: [
            {
              start: 15,
              data:
                '0xba620d61dac4ddf2d7905722b259b0bd34ec4d37c5796d9a22537c54b3f972d8'
            },
            {
              start: 7,
              data:
                '0x59a76952828fd54de12b708bf0030e055ae148c0a5a7d8b4f191d519275337e8'
            }
          ]
        }
      }
      await expect(
        commitmentContract.verifyInclusion(
          leaf3.data,
          '0x0000000000000000000000000000000000000002',
          { start: 5000, end: 5010 },
          invalidInclusionProof,
          blockNumber
        )
      ).to.be.revertedWith(
        'required address must not exceed the implicit address'
      )
    })
  })

  describe('getCurrentBlock', () => {
    beforeEach(async () => {
      await expect(commitmentContract.submitRoot(1, root)).to.emit(
        commitmentContract,
        'BlockSubmitted'
      )
    })

    it('suceed to get current block', async () => {
      const currentBlock = await commitmentContract.currentBlock()
      expect(currentBlock).to.be.equal(1)
    })
  })

  describe('blocks', () => {
    beforeEach(async () => {
      await expect(commitmentContract.submitRoot(1, root)).to.emit(
        commitmentContract,
        'BlockSubmitted'
      )
    })

    it('suceed to get a block', async () => {
      const block = await commitmentContract.blocks(1)
      expect(block).to.be.equal(root)
    })
  })
})
