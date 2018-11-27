/*
This Token Contract implements the standard token functionality (https://github.com/ethereum/EIPs/issues/20) as well as the following OPTIONAL extras intended for use by humans.

In other words. This is intended for deployment in something like a Token Factory or Mist wallet, and then used by humans.
Imagine coins, currencies, shares, voting weight, etc.
Machine-based, rapid creation of many tokens would not necessarily need these extra features or will be minted in other manners.

1) Initial Finite Supply (upon creation one specifies how much is minted).
2) In the absence of a token registry: Optional Decimal, Symbol & Name.
3) Optional approveAndCall() functionality to notify a contract if an approval() has occurred.

.*/
pragma solidity ^0.4.4;

import "./StandardToken.sol";

contract HumanStandardToken is StandardToken {

    /// @dev Revert if the contract receives Ether.
    function () external payable {
        revert();
    }

    /* Public variables of the token */

    /*
     * The following variables are OPTIONAL vanities. One does not have to include them.
     * They allow to customise the token contract but do not influence the core functionality.
     * Some wallets/interfaces might not even bother to look at this information.
    */

    string public name;
    uint8 public decimals;
    string public symbol;
    string public version = 'H0.1';
    address public creator;
    bool alreadySetUp = false;

    constructor() public {
        creator = msg.sender;
    }

    function setup(uint256 _initialAmount, string _name, uint8 _decimals, string _symbol) public {
        require(msg.sender == creator);
        require(!alreadySetUp);
        balances[msg.sender] = _initialAmount;               // Give the creator all initial tokens
        totalSupply = _initialAmount;                        // Update total supply
        name = _name;                                        // Set the name for display purposes
        decimals = _decimals;                                // Amount of decimals for display purposes
        symbol = _symbol;                                    // Set the symbol for display purposes
        alreadySetUp = true ;                                // Prevent it from being called a second time
    }

    /* Approves and then calls the receiving contract */
    function approveAndCall(address _spender, uint256 _value, bytes _extraData) public returns (bool) {
        allowed[msg.sender][_spender] = _value;
        emit Approval(msg.sender, _spender, _value);

        //call the receiveApproval function on the contract you want to be notified. This crafts the function signature manually so one doesn't have to include a contract in here just for this.
        //receiveApproval(address _from, uint256 _value, address _tokenContract, bytes _extraData)
        //it is assumed that when does this that the call *should* succeed, otherwise one would use vanilla approve instead.
        if (!_spender.call(bytes4(bytes32(keccak256("receiveApproval(address,uint256,address,bytes)"))), msg.sender, _value, this, _extraData))
            revert();
        return true;
    }

    // Getters. should be removed since they refer to public state variables,
    // which getters are automatically generated at compile time.

    function name() public view returns (string) {
        return name;
    }

    function symbol() public view returns (string) {
        return symbol;
    }

    function decimals() public view returns (uint8) {
        return decimals;
    }

    function creator() public view returns (address) {
        return creator;
    }
}
