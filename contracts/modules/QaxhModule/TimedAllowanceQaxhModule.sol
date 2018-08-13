pragma solidity 0.4.24;
import "./AllowanceQaxhModule.sol";


/// @title TimedAllowanceQaxhModule : extends AllowanceQaxhModule
/// so that the contract automatically renew spending limit at a given frequency
/// example : paying electricity each month
/// @author clem
contract TimedAllowanceQaxhModule is AllowanceQaxhModule {

	struct timeStruct {
		uint frequency; //counted in secondes (so that we can add it to unix timestamps)
		uint nextRenewal; //at midnight
		uint256 spendingLimit;
	}

	mapping (address => timeStruct) internal frequency ; //frequency at which renewing the allowance, counted in days

	function changeTimedAllowance(
		address user,
		uint256 allowance,
		uint256 _frequency
	)
	public
	filterOwner
	{
		frequency[user].frequency = _frequency ;
		frequency[user].nextRenewal = now + frequency[user].frequency;
		frequency[user].spendingLimit = allowance;
		super.changeAllowance(user, allowance);
	}

	/// override from AllowanceQaxhModule
	function isUnderAllowance(
		address sender,
		uint256 amount
	)
	//internal
	public
	returns (bool)
	{
		if (frequency[sender].spendingLimit > 0) { //this is a timed allowance

			//if ( trim(now) >= frequency[sender].nextRenewal ) {
			//	frequency[sender].nextRenewal = trim(frequency[sender].nextRenewal + frequency[sender].frequency);
			//	allowances[sender] = frequency[sender].spendingLimit; //allowances are not cumulative
			//}
			if (now >= frequency[sender].nextRenewal) {
				frequency[sender].nextRenewal += frequency[sender].frequency;
				allowances[sender] = frequency[sender].spendingLimit; //allowances are not cumulative
			}
			return amount <= allowances[sender]; //for both timed and normal allowances
		}
		return amount <= allowances[sender]; //for both timed and normal allowances
	}

	/// taken from gnosis at
	/// https://github.com/gnosis/safe-contracts/blob/master/contracts/modules/DailyLimitModule.sol
	/// (function today() )
	/// trim a timestamp to midnight
	function trim(
		uint timestamp
	)
	public
	pure
	returns (uint)
	{
		return timestamp - (timestamp % 1 days);
	}

	function getFrequency(address user)
	view
	returns (uint)
	{
		return frequency[user].frequency;
	}

	function getSpendingLimit(address user)
	view
	returns (uint256)
	{
		return frequency[user].spendingLimit;
	}

	function getNextRenewal(address user)
	view
	returns (uint)
	{
		return frequency[user].nextRenewal;
	}

	function getNow()
	view
	returns (uint)
	{
		return now;
	}

	function getStruct(address user)
	returns (string)
	{
		emit Struct(frequency[user].frequency , frequency[user].nextRenewal, frequency[user].spendingLimit);
	}

	event Struct(uint a, uint b, uint256 c);

}