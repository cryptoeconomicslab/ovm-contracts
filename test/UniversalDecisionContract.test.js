/* contract imports */
const chai = require('chai');
const {createMockProvider, deployContract, getWallets, solidity, link} = require('ethereum-waffle');
const UniversalAdjudicationContract = require('../build/UniversalAdjudicationContract');
const Utils = require('../build/Utils');
const NotPredicate = require('../build/NotPredicate');
const TestPredicate = require('../build/TestPredicate');
const ethers = require('ethers');
const abi = new ethers.utils.AbiCoder();

chai.use(solidity);
chai.use(require('chai-as-promised'));
const {expect, assert} = chai;

describe('UniversalAdjudicationContract', () => {
  let provider = createMockProvider();
  let wallets = getWallets(provider);
  let wallet = wallets[0];
  let adjudicationContract;
  let utils;
  let testPredicate, notPredicate;
  let trueProperty, notProperty, notFalseProperty;
  const Undecided = 0;
  const True = 1;
  const False = 2;

  before(async () => {
    utils = await deployContract(wallet, Utils, []);
    link(UniversalAdjudicationContract, 'contracts/Utils.sol:Utils', utils.address);
  });

  beforeEach(async () => {
    adjudicationContract = await deployContract(wallet, UniversalAdjudicationContract);
    notPredicate = await deployContract(wallet, NotPredicate, [adjudicationContract.address]);
    await adjudicationContract.setNotPredicateAddress(notPredicate.address);
    testPredicate = await deployContract(wallet, TestPredicate, [adjudicationContract.address]);
    trueProperty = {
      predicateAddress: testPredicate.address,
      inputs: ['0x01']
    };
    falseProperty = {
      predicateAddress: testPredicate.address,
      inputs: []
    };
    notProperty = {
      predicateAddress: notPredicate.address,
      inputs: [abi.encode(['tuple(address, bytes[])'], [[testPredicate.address, ['0x01']]])]
    };
    notFalseProperty = {
      predicateAddress: notPredicate.address,
      inputs: [abi.encode(['tuple(address, bytes[])'], [[testPredicate.address, []]])]
    };
  });

  describe('claimProperty', () => {
    it('adds a claim', async () => {
      await adjudicationContract.claimProperty(notProperty);
      const claimId = await adjudicationContract.getPropertyId(notProperty);
      const game = await adjudicationContract.getGame(claimId);

      // check newly stored property is equal to the claimed property
      assert.equal(game.property.predicateAddress, notProperty.predicateAddress);
      assert.equal(game.property.input, notProperty.input);
      assert.equal(game.decision, Undecided);
    });
    it('fails to add an already claimed property and throws Error', async () => {
      // claim a property
      await adjudicationContract.claimProperty(trueProperty);
      // check if the second call of the claimProperty function throws an error
      assert(await expect(adjudicationContract.claimProperty(trueProperty)).to.be.rejectedWith(Error));
    });
  });

  describe('challenge', () => {
    it('not(true) is challenged by true', async () => {
      await adjudicationContract.claimProperty(notProperty);
      await adjudicationContract.claimProperty(trueProperty);
      const gameId = await adjudicationContract.getPropertyId(notProperty);
      const challengingGameId = await adjudicationContract.getPropertyId(trueProperty);
      await adjudicationContract.challenge(gameId, [["0x", trueProperty]], challengingGameId);
      const game = await adjudicationContract.getGame(gameId);

      assert.equal(game.challenges.length, 1);
    });
    it('not(true) fail to be challenged by not(false)', async () => {
      await adjudicationContract.claimProperty(notProperty);
      await adjudicationContract.claimProperty(notFalseProperty);
      const gameId = await adjudicationContract.getPropertyId(notProperty);
      const challengingGameId = await adjudicationContract.getPropertyId(notFalseProperty);
      await expect(adjudicationContract.challenge(gameId, [["0x", notFalseProperty]], challengingGameId)).to.be.reverted;
    });
  });

  describe('decideClaimToFalse', () => {
    it('not(true) decided false with a challenge by true', async () => {
      await adjudicationContract.claimProperty(notProperty);
      await adjudicationContract.claimProperty(trueProperty);
      const gameId = await adjudicationContract.getPropertyId(notProperty);
      const challengingGameId = await adjudicationContract.getPropertyId(trueProperty);
      await adjudicationContract.challenge(gameId, [["0x", trueProperty]], challengingGameId);
      await testPredicate.decideTrue(['0x01'], '0x');
      await adjudicationContract.decideClaimToFalse(gameId, challengingGameId);
      const game = await adjudicationContract.getGame(gameId);
      // game should be decided false
      assert.equal(game.decision, False);
    });
    it('not(false) fail to decided false without challenges', async () => {
      await adjudicationContract.claimProperty(notFalseProperty);
      await adjudicationContract.claimProperty(falseProperty);
      const gameId = await adjudicationContract.getPropertyId(notFalseProperty);
      const challengingGameId = await adjudicationContract.getPropertyId(falseProperty);
      await adjudicationContract.challenge(gameId, [["0x", falseProperty]], challengingGameId);
      await expect(adjudicationContract.decideClaimToFalse(gameId, challengingGameId)).to.be.reverted;
    });
  });

  describe('decideClaimToTrue', () => {
    it('not(true) decided true because there are no challenges', async () => {
      await adjudicationContract.claimProperty(notProperty);
      const gameId = await adjudicationContract.getPropertyId(notProperty);
      // increase 10 blocks to pass dispute period
      await increaseBlocks(wallets, 10);
      await adjudicationContract.decideClaimToTrue(gameId);

      const game = await adjudicationContract.getGame(gameId);
      // game should be decided true
      assert.equal(game.decision, True);
    });
    it('fail to decided true because dispute period has not passed', async () => {
      await adjudicationContract.claimProperty(notProperty);
      const gameId = await adjudicationContract.getPropertyId(notProperty);
      await expect(adjudicationContract.decideClaimToTrue(gameId)).to.be.reverted;
    });
  });

  describe('challenge nested property', () => {
    it('not(not(not(true))) is challenged by true', async () => {
      const encodedTrueProperty = abi.encode(['tuple(address, bytes[])'], [[testPredicate.address, ['0x01']]])
      const encodedNotTrueProperty = abi.encode(['tuple(address, bytes[])'], [[notPredicate.address, [encodedTrueProperty]]])
      const encodedNotNotTrueProperty = abi.encode(['tuple(address, bytes[])'], [[notPredicate.address, [encodedNotTrueProperty]]])
      const notNotNotTrueProperty = {
        predicateAddress: notPredicate.address,
        inputs: [encodedNotNotTrueProperty]
      };
      const challenges = [
        {
          challengeInput: "0x",
          challengeProperty: {
            predicateAddress: notPredicate.address,
            inputs: [encodedNotTrueProperty]
          }
        },
        {
          challengeInput: "0x",
          challengeProperty: {
            predicateAddress: notPredicate.address,
            inputs: [encodedTrueProperty]
          }
        },
        {
          challengeInput: "0x",
          challengeProperty: trueProperty
        },
      ]
      await adjudicationContract.claimProperty(notNotNotTrueProperty);
      await adjudicationContract.claimProperty(trueProperty);
      const gameId = await adjudicationContract.getPropertyId(notNotNotTrueProperty);
      const challengingGameId = await adjudicationContract.getPropertyId(trueProperty);
      await adjudicationContract.challenge(gameId, challenges, challengingGameId);
      const game = await adjudicationContract.getGame(gameId);

      assert.equal(game.challenges.length, 1);
    });
  });
});

async function increaseBlocks(wallets, num) {
  for(let i = 0;i < num;i++) {
    await increaseBlock(wallets)
  }
}

async function increaseBlock(wallets) {
  let tx = {
    to: wallets[1].address,
    value: ethers.utils.parseEther('0.0')
  };
  await wallets[0].sendTransaction(tx);
}
