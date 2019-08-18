/* contract imports */
const chai = require('chai');
import {createMockProvider, deployContract, getWallets, solidity} from 'ethereum-waffle';
const UniversalDecisionContract = require('../build/UniversalDecisionContract');

chai.use(solidity);
const {expect} = chai;

describe('UniversalDecisionContract', () => {
  let provider = createMockProvider();
  const wallets = getWallets(provider);
  let wallet = wallets[0];
  let token;
  let adjudicationContract;
  
  beforeEach(async () => {
    token = await deployContract(wallet, UniversalDecisionContract, [wallet.address, 1000]);
    adjudicationContract = await deployContract(wallet, Adjudicator)
  });

  describe('claimProperty', () => {
    it('adds a claim', async () => {
      const _claim = {
          predicate: '0x5a8cDc465fba0f4dC27aB2b6DA321AfeBbE5a0Aa'
          input: '0x01'
      }

      // claim a property
      await adjudicationContract.claimProperty(_claim);

      //check that the property was stored 
      const claimId = await adjudicationContract.Utils.getPropertyId(_claim);
      const claim = await adjudicationContract.Utils.getClaim(claimId);

      /* function getClaim(bytes32 claimId) public view returns (types.Claim memory) {
        return claims[claimId];
      */

      claim.decidedAfter.toNumber.should.not.equal(0)
    });
  });
});
