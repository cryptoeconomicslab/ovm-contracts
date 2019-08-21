/* contract imports */
const chai = require('chai');
const {createMockProvider, deployContract, getWallets, solidity, link} = require('ethereum-waffle');
const UniversalDecisionContract = require('../build/UniversalDecisionContract');
const Utils = require('../build/Utils');
const TestPredicate = require('../build/TestPredicate');
const ethers =require('ethers');


chai.use(solidity);
chai.use(require('chai-as-promised'));
const {expect, assert} = chai;

describe('UniversalDecisionContract', () => {
  let provider = createMockProvider();
  let wallets = getWallets(provider);
  let wallet = wallets[0];
  let decisionContract;
  let utils;
  let testPredicate;

  before(async () => {
    utils = await deployContract(wallet, Utils, []);
    link(UniversalDecisionContract, 'contracts/Utils.sol:Utils', utils.address);
  });

  beforeEach(async () => {
    decisionContract = await deployContract(wallet, UniversalDecisionContract);
    testPredicate = await deployContract(wallet, TestPredicate, [decisionContract.address]);
  });

  describe('claimProperty', () => {
    it('adds a claim', async () => {
      const property = {
        predicate: testPredicate.address,
        input: '0x01'
      };

      await decisionContract.claimProperty(property);
      const claimId = await decisionContract.getPropertyId(property);
      const claim = await decisionContract.getClaim(claimId);

      // check newly stored property is equal to the claimed property
      assert.equal(claim.predicate, property.predicate);
      assert.equal(claim.input, property.input);
    });
    it('fails to add an already claimed property', async () => {
      const property = {
        predicate: testPredicate.address,
        input: '0x01'
      };
      // claim a property
      await decisionContract.claimProperty(property);
      // check if the second call of the claimProperty function throws an error 
      assert(expect(decisionContract.claimProperty(property)).to.eventually.be.rejected);
    });
  });

  describe('decideProperty', () => {
    it('approve a claim when decision is true', async () => {
      const testPredicateInput = {
        value: 1
      };
      const property = await testPredicate.createPropertyFromInput(testPredicateInput);
      await testPredicate.decideTrue(testPredicateInput);
      const decidedPropertyId = await decisionContract.getPropertyId(property);
      const blockNumber = await provider.getBlockNumber()
      const decidedClaim = await decisionContract.claims(decidedPropertyId);
      
      //check the block number of newly decided property is equal to the claimed property's 
      assert.equal(decidedClaim.decidedAfter, blockNumber - 1);
    });

    it('deletes a claim when the decision is false', async () => {
      const testPredicateInput = {
        value: 1
      };
      const property = await testPredicate.createPropertyFromInput(testPredicateInput);
      await testPredicate.decideFalse(testPredicateInput);
      const falsifiedPropertyId = await decisionContract.getPropertyId(property);
      const falsifiedClaim = await decisionContract.claims(falsifiedPropertyId);

      // check the claimed property is deleted 
      assert(isEmptyClaimStatus(falsifiedClaim));
    })
  });
});

function isEmptyClaimStatus(_claimStatus) {
  return ethers.utils.bigNumberify(_claimStatus.property.predicate).isZero()
    && ethers.utils.arrayify(_claimStatus.property.input).length === 0
    && _claimStatus.decidedAfter.isZero()
    && _claimStatus.numProvenContradictions.isZero()
}
