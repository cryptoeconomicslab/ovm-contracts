const Utils = artifacts.require('Utils.sol')
const UniversalDecisionContract = artifacts.require('UniversalDecisionContract')
const TestPredicate = artifacts.require('TestPredicate')
const CommitmentContract = artifacts.require('CommitmentContract')

module.exports = function(deployer) {
  deployer
    .deploy(Utils)
    .then(() => deployer.link(Utils, UniversalDecisionContract))
    .then(() => deployer.deploy(UniversalDecisionContract))
    .then(() => deployer.deploy(TestPredicate))
    .then(() => deployer.deploy(CommitmentContract))
}
