const UniversalDecisionContract = artifacts.require("UniversalDecisionContract");
const Utils = artifacts.require("Utils");
const {constants} = require('ethers');


require('chai')
  .use(require('chai-as-promised'))
  .use(require('chai-bignumber'))
  .should();

require('mocha');

contract("UniversalDecisionContract", async () => {
  beforeEach(async () => {
    this.predicate = await Predicate.new()
    this.universalDecisionContract = await UniversalDecisionContract.new()
  });

  describe('claimProperty', async () => {
    it('should store new claims in status', async () => {
        const property = [constants.AddressZero, constants.HashZero]
        await this.universalDecisionContract.claimProperty(property)
    });
  });
})

/*
  describe('decideProperty', async () => {

  })

  describe('verifyImplicationProof', async () => {
    it('should verify an implication proof when the property is the implication of itself', async () => {
      const rootPremise = 
      await this.universalDecisionContract.verifyImplicaitonProof(rootPremise, implicationProof)
    });
    it('should verify the implication proof when there are multiple properties attested', async () => {
    });
    it('should fail to verify the implication proof', async () => {
    })
  })
  describe('verifyContradictingImplications', async () => {

  })
  describe('proveClaimContradictsDecision', async () => {

  })
  describe('proveUndecidedContradiction', async () => {

  })
  describe('removeContradiction', async () => {

  })
}) 
*/