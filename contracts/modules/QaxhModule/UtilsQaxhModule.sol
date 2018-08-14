pragma solidity 0.4.24;
import "../../Module.sol";
import "../../QaxhMasterLedger.sol";


/// @title UtilsQaxhModule : all the little things needed to implement  a qaxh safe
/// @author clem
contract UtilsQaxhModule is Module {

	/// @dev Setup function sets manager
	function setup()
	public
	{
		setManager();
	}

	address internal qaxh = 0xeA41A27F8545d091ED604ac99CE46002eDA3E360;
	address internal owner;
	QaxhMasterLedger internal qaxhMasterLedger;

	//////////////a supprimer////////////////////////////////
	function setQaxh(address _qaxh)
	public
	{
		qaxh = _qaxh;
	}
	//should ultimaly be put in the constructor
	function setLedger(address _ledger)
	public
	{
		qaxhMasterLedger = QaxhMasterLedger(_ledger);
	}

	////////////////////////////////////////////////////////////////////////////////////////////////
	////////////////////////////filters to manage permissions///////////////////////////////////////
	////////////////////////////////////////////////////////////////////////////////////////////////
	modifier filterQaxh()
	{
		//emit Event(msg.sender);
		require(msg.sender == qaxh, "This method can only be called by the qaxh address");
		_;
	}

	modifier filterOwner()
	{
		//emit Event(msg.sender);
		require(msg.sender == owner, "This method can only be called by the owner of the safe");
		_;
	}

	modifier filterSelfOrOwner()
	{
		//emit Event(msg.sender);
		require(msg.sender == address(this) || msg.sender == owner,
			"This method can only be called by the owner of the safe or qaxh");
		_;
	}

	////////////////////////////////////////////////////////////////////////////////////////////////
	////////////////////////////////////Owner managing//////////////////////////////////////////////
	////////////////////////////////////////////////////////////////////////////////////////////////

	function replaceOwner(
		address _owner
	)
	public
	filterQaxh
	{
		owner = _owner;
	}

	////////////////////////////////////////////////////////////////////////////////////////////////
	//////////////////////for development///////////////////////////////////////////////////////////
	////////////////////////////////////////////////////////////////////////////////////////////////
	event Event(
		address _address,
		string _description
	);

	function getQaxh()
	public
	view
	returns (address)
	{
		return qaxh;
	}

	event Log(
		uint a,
		uint b
	);

	function getOwner()
	public
	view
	returns (address)
	{
		return owner;
	}

}
