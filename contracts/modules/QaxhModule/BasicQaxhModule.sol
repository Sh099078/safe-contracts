pragma solidity 0.4.24;
import "./UtilsQaxhModule.sol";


/// @title BasicQaxhSafe : implement the basic function of a qaxh safe :
/// owner withdrawing money and secure deposits.
/// @author clem
contract BasicQaxhModule is UtilsQaxhModule {

	////////////////////////////////////////////////////////////////////////////////////////////////
	///////////////////////////////// Handle receiving money ///////////////////////////////////////
	////////////////////////////////////////////////////////////////////////////////////////////////
	//handle the ether sent to the safe
	//revert if the caller isn't the safe or if the person sending ether isn't the owner of the safe
	function handle(
		address sender,
		uint256 value,
		bytes data
	)
	public
	{
		require(msg.sender == address(manager));
		if (value != 0) require(handleDeposit(sender, value)); //revert if the safe if not allowed to receive this money
	}

	//Deposit
	function handleDeposit( //formerly, isAuthorized
		address sender,
		uint256 value
	)
	internal
	view
	returns (bool)
	{
		if (sender == owner) return true; //the owner is allowed to load the safe
		if (value < 5000000000) return true; //little loads are permitted
		if(qaxhMasterLedger.qaxhSafe(sender)) return true; //others qaxh safe are permitted
		return false;
	}

	////////////////////////////////////////////////////////////////////////////////////////////////
	//////////////////////////////////Owner spending money//////////////////////////////////////////
	////////////////////////////////////////////////////////////////////////////////////////////////

	function sendFromSafe(
		address to,
		uint256 amount,
		address token
	)
	public
	filterOwner
	{
		if (token == 0) {
			require(manager.execTransactionFromModule(to, amount, "", Enum.Operation.Call), "Could not execute ether transfer");
		} else {
			bytes memory data = abi.encodeWithSignature("transfer(address,uint256)", to, amount);
			require(manager.execTransactionFromModule(token, 0, data, Enum.Operation.Call), "Could not execute token transfer");
		}
	}
}