/* contract imports */
const chai = require('chai');
const {createMockProvider, deployContract, getWallets, solidity, link} = require('ethereum-waffle');
const UniversalDecisionContract = require('../build/UniversalDecisionContract');
const Utils = require('../build/Utils');
const TestPredicate = require('../build/TestPredicate');

chai.use(solidity);
const {expect, assert} = chai;

describe('UniversalDecisionContract', () => {
  let provider = createMockProvider();
  const wallets = getWallets(provider);
  let wallet = wallets[0];
  let decisionContract;
  let utils;
  let testPredicate;
  
  beforeEach(async () => {
    utils = await deployContract(wallet, Utils, []);
    link(UniversalDecisionContract, 'contracts/Utils.sol:Utils', utils.address);
    decisionContract = await deployContract(wallet, UniversalDecisionContract);
    testPredicate = await deployContract(wallet, TestPredicate);
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
  });
});
