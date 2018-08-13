pragma solidity 0.4.24;
import "../../../Module.sol";
import "../../../GnosisSafe.sol";
import "../../../QaxhMasterLedger.sol";
import "../../../ModuleManager.sol";


/// @title Modifier - modifie all functions of the gnosis safe - made to test
/// @author clem
contract QaxhModule is Module {

    /// @dev Setup function sets manager
    function setup()
    public
    {
        setManager();
    }

    //non payable contract
    function ()
    public
    {
        //nothing to do here
    }

    address private qaxh = 0xeA41A27F8545d091ED604ac99CE46002eDA3E360;
    address private owner;
    QaxhMasterLedger private qaxhMasterLedger;

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
        emit Event(msg.sender);
        require(msg.sender == qaxh, "This method can only be called by the qaxh address");
        _;
    }

    modifier filterOwner()
    {
        emit Event(msg.sender);
        require(msg.sender == owner, "This method can only be called by the owner of the safe");
        _;
    }

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
        uint256 amount
    )
    public
    filterOwner
    returns (bool success)
    {

        require(manager.execTransactionFromModule(to, amount, "", Enum.Operation.Call), "Could not execute ether transfer");
    }

    ////////////////////////////////////////////////////////////////////////////////////////////////
    ////////////////////////////////// Allowance system ////////////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////////////////////////////

    mapping (address => uint256) private allowances;

    //extern user asking for a transfert : no check is made at this point other
    //than if he has enough allowance to withdraw the ammount
    function transferFrom(
        address to,
        uint256 amount
    )
    public
    {
        require(amount <= allowances[msg.sender]);
        allowances[msg.sender] -= amount;
        manager.execTransactionFromModule(to, amount, "", Enum.Operation.Call);
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
        address _address
    );

    function getQaxh()
    public
    view
    returns (address)
    {
        return qaxh;
    }

    event Log(
        uint256 allowed,
        uint256 asked
    );

    function getOwner()
    public
    view
    returns (address)
    {
        return owner;
    }

}
