pragma solidity ^0.4.4;

import "./StandardToken.sol";

/// @title A non-fongible token implementing the ERC20 interface.
/// @author Clémence Gardelle
/// @author Loup Federico
contract HumanStandardToken is StandardToken {

    string public name;
    uint8 public decimals;
    string public symbol;
    string public version = 'H0.1';
    address public creator;

    constructor(uint256 _initialAmount, string _name, uint8 _decimals, string _symbol) public {
        creator = tx.origin;
        balances[tx.origin] = _initialAmount;
        totalSupply = _initialAmount;
        name = _name;
        decimals = _decimals;
        symbol = _symbol;
    }

    function () external payable {
        revert();
    }

}
