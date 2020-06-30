pragma solidity ^0.5.0;
pragma experimental ABIEncoderV2;

import {DataTypes as types} from "../DataTypes.sol";
import {Dispute} from "../Dispute/DisputeInterface.sol";
import {DisputeManager} from "../Dispute/DisputeManager.sol";

contract MockDisputeContract is Dispute {
    DisputeManager disputeManager;

    constructor(address _disputeManagerAddress) public {
        disputeManager = DisputeManager(_disputeManagerAddress);
    }

    function claim(bytes[] memory _propertyInputs, bytes[] memory _witness)
        public
    {
        types.Property memory property = types.Property(
            address(this),
            _propertyInputs
        );
        disputeManager.claim(property);
    }

    // modifier test
    function claimInvalidAddress(bytes[] memory _propertyInputs) public {
        types.Property memory property = types.Property(
            address(0),
            _propertyInputs
        );
        disputeManager.claim(property);
    }

    function challenge(
        bytes[] memory _propertyInputs,
        bytes[] memory _challengeInputs,
        bytes[] memory _witness
    ) public {
        types.Property memory property = types.Property(
            address(this),
            _propertyInputs
        );
        types.Property memory challengeProperty = types.Property(
            address(this),
            _challengeInputs
        );
        disputeManager.challenge(property, challengeProperty);
    }

    // modifier test
    function challengeInvalidAddress(
        bytes[] memory _propertyInputs,
        bytes[] memory _challengeInputs,
        bytes[] memory _witness
    ) public {
        types.Property memory property = types.Property(
            address(0),
            _propertyInputs
        );
        types.Property memory challengeProperty = types.Property(
            address(0),
            _challengeInputs
        );
        disputeManager.challenge(property, challengeProperty);
    }

    function removeChallenge(
        bytes[] memory _propertyInputs,
        bytes[] memory _challengeInputs,
        bytes[] memory _witness
    ) public {
        types.Property memory property = types.Property(
            address(this),
            _propertyInputs
        );
        types.Property memory challengeProperty = types.Property(
            address(this),
            _challengeInputs
        );
        disputeManager.removeChallenge(property, challengeProperty);
    }

    // modifier test
    function removeChallengeInvalidAddress(
        bytes[] memory _propertyInputs,
        bytes[] memory _challengeInputs,
        bytes[] memory _witness
    ) public {
        types.Property memory property = types.Property(
            address(0),
            _propertyInputs
        );
        types.Property memory challengeProperty = types.Property(
            address(0),
            _challengeInputs
        );
        disputeManager.removeChallenge(property, challengeProperty);
    }

    function setGameResult(bytes[] memory _propertyInputs, bool result) public {
        types.Property memory property = types.Property(
            address(this),
            _propertyInputs
        );
        disputeManager.setGameResult(property, result);
    }

    // modifier test
    function setGameResultInvalidAddress(
        bytes[] memory _propertyInputs,
        bool result
    ) public {
        types.Property memory property = types.Property(
            address(0),
            _propertyInputs
        );
        disputeManager.setGameResult(property, result);
    }

    function settle(bytes[] memory _propertyInputs) public {
        types.Property memory property = types.Property(
            address(this),
            _propertyInputs
        );
        disputeManager.settleGame(property);
    }

    function settleInvalidAddress(bytes[] memory _propertyInputs) public {
        types.Property memory property = types.Property(
            address(0),
            _propertyInputs
        );
        disputeManager.settleGame(property);
    }

}
