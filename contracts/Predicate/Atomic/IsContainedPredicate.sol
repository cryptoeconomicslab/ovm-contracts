pragma solidity ^0.6.0;
pragma experimental ABIEncoderV2;

import {DataTypes as types} from "../../DataTypes.sol";
import "../../Utils.sol";
import "./BaseAtomicPredicate.sol";

contract IsContainedPredicate is BaseAtomicPredicate {
    constructor(address _uacAddress, address _utilsAddress)
        public
        BaseAtomicPredicate(_uacAddress, _utilsAddress)
    {}

    function decide(bytes[] memory _inputs)
        public
        view
        override
        returns (bool)
    {
        types.Range memory range = utils.bytesToRange(_inputs[0]);
        types.Range memory subrange = utils.bytesToRange(_inputs[1]);
        require(
            range.start <= subrange.start && subrange.end <= range.end,
            "range must contain subrange"
        );
        return true;
    }
}
