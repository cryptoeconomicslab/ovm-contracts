pragma solidity ^0.5.0;
pragma experimental ABIEncoderV2;

contract DataTypes {
    struct Property {
        address predicate;
        bytes input;
    }
}

contract UniversalDecisionContract {
    function decideProperty(DataTypes.Property memory, bool) public {}
}

contract TestPredicate {
    address udcAddress;

    constructor(address _udcAddress) public {
        udcAddress = _udcAddress;
    }

    struct TestPredicateInput {
        uint value;
    }

    event ValueDecided(bool decision, uint value);

    function createPropertyFromInput(TestPredicateInput memory _input) public view returns (DataTypes.Property memory) {
        DataTypes.Property memory property = DataTypes.Property({predicate:address(this), input:abi.encode(_input)});
        return property;
    }

    function decideTrue(TestPredicateInput memory _input) public {
        DataTypes.Property memory property = createPropertyFromInput(_input);

        UniversalDecisionContract(udcAddress).decideProperty(property, true);

        emit ValueDecided(true, _input.value);
    }

    function decideFalse(TestPredicateInput memory _input) public {
        DataTypes.Property memory property = createPropertyFromInput(_input);

        UniversalDecisionContract(udcAddress).decideProperty(property, false);

        emit ValueDecided(false, _input.value);
    }
}