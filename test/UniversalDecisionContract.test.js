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
      console.log(claim)
      // check newly stored property is equal to the claimed property
      assert.equal(claim.predicate, property.predicate);
      assert.equal(claim.input, property.input);
    });
    // it('fails to add a claim, which has already been claimed', async () => {
    //   const alreadyClaimedId  //requireで落ちる
    // });
  });

  describe('decideProperty', () => {
    it('approve a claim when decision is true', async () => {
      const testPredicateInput = {
        value: 1
      };
      const res = await testPredicate.decideTrue(testPredicateInput);
      console.log(res)
      const property = await testPredicate.createPropertyFromInput(testPredicateInput);
      await testPredicate.decideTrue(testPredicateInput);
      const decidedPropertyId = await decisionContract.getPropertyId(property);
      const blockNumber = await web3.eth.getBlockNumber()

      //check newly decided property is equal to the claimed property
      assert.equal(claims[decidedPropertyId].decidedAfter, block.number - 1);

    });
  });
});
