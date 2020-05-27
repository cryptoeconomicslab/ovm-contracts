pragma solidity ^0.5.0;
pragma experimental ABIEncoderV2;

import {DataTypes as types} from "../../DataTypes.sol";
import "../../Utils.sol";
import "./BaseAtomicPredicate.sol";


contract HasIntersectionPredicate is BaseAtomicPredicate {
    constructor(address _uacAddress, address _utilsAddress)
        public
        BaseAtomicPredicate(_uacAddress, _utilsAddress)
    {}

    function decide(bytes[] memory _inputs) public view returns (bool) {
        types.Range memory first = utils.bytesToRange(_inputs[0]);
        types.Range memory second = utils.bytesToRange(_inputs[1]);
        bool a = first.start >= second.start && first.start < second.end;
        bool b = second.start >= first.start && second.start < first.end;

        require(a || b, "range must have intersection");
        return true;
    }
}
