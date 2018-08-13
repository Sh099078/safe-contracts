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

	mapping (address => uint256) internal allowances;

	//extern user asking for a transfert : no check is made at this point other
	//than if he has enough allowance to withdraw the ammount
	function transferFrom(
		address to,
		uint256 amount
	)
	public
	{
		require(isUnderAllowance(msg.sender, amount));
		allowances[msg.sender] -= amount;
		require(manager.execTransactionFromModule(to, amount, "", Enum.Operation.Call));
	}

	//do not erase this function, it's overwritten in TimedAllowanceQaxhModule.
	function isUnderAllowance(
		address sender,
		uint256 amount
	)
	//internal
	public
	returns (bool)
	{
		return amount <= allowances[sender];
	}

	function changeAllowance(
		address user,
		uint256 allowance
	)
	public
	filterOwner
	{
		require(qaxhMasterLedger.qaxhSafe(user)); //only other qaxh safes are allowed to withdraw
		allowances[user] = allowance;
	}

	function getAllowance(
		address user
	)
	public
	view
	returns (uint256)
	{
		return allowances[user];
	}

}
