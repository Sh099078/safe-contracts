pragma solidity 0.4.24;
import "./BasicQaxhModule.sol";


/// @title AllowanceQaxhSafe : extends BasicQaxhModule
/// allow to authorize others user to withdraw from the safe under a spending limit
/// there isn't any time limit or authomated refill of the spending limit
/// @author clem
contract AllowanceQaxhModule is BasicQaxhModule {


	////////////////////////////////////////////////////////////////////////////////////////////////
	////////////////////////////////// Allowance system ////////////////////////////////////////////
	////////////////////////////////////////////////////////////////////////////////////////////////

	mapping (address => mapping (address => uint256)) internal allowances; //mapping user address to token address to allowances

	//extern user asking for a transfert : no check is made at this point other
	//than if he has enough allowance to withdraw the ammount
	function transferFrom(
		address to,
		uint256 amount,
		address token
	)
	public
	{
		require(isUnderAllowance(msg.sender, amount, token));
		allowances[msg.sender][token] -= amount;
		sendByAllowance(to, amount, token);
	}

	//do not erase this function, it's overwritten in TimedAllowanceQaxhModule.
	function isUnderAllowance(
		address sender,
		uint256 amount,
		address token
	)
	//internal
	public
	returns (bool)
	{
		return amount <= allowances[sender][token];
	}

	function changeAllowance(
		address user,
		uint256 allowance,
		address token
	)
	public
	filterOwner
	{
		require(qaxhMasterLedger.qaxhSafe(user)); //only other qaxh safes are allowed to withdraw
		allowances[user][token] = allowance;
	}

	function getAllowance(
		address user,
		address token
	)
	public
	view
	returns (uint256)
	{
		return allowances[user][token];
	}

	function sendByAllowance(
		address to,
		uint256 amount,
		address token
	)
	internal
	{
		if (token == 0) {
			require(manager.execTransactionFromModule(to, amount, "", Enum.Operation.Call), "Could not execute ether transfer");
		} else {
			bytes memory data = abi.encodeWithSignature("transfer(address,uint256)", to, amount);
			require(manager.execTransactionFromModule(token, 0, data, Enum.Operation.Call), "Could not execute token transfer");
		}
	}

}
