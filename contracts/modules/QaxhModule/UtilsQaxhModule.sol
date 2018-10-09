pragma solidity 0.4.24;
import "../../Module.sol";
import "../../QaxhMasterLedger.sol";

/// @title UtilsQaxhModule : all the little things needed to implement  a qaxh safe
/// @author clem
contract UtilsQaxhModule is Module {

    address internal qaxh = 0xeA41A27F8545d091ED604ac99CE46002eDA3E360;
    address internal owner;
    QaxhMasterLedger internal qaxhMasterLedger;

    /// @dev Setup function sets manager
    function setup() public {
        setManager();
    }

    // Kept for testing purposes only. Will be deleted eventually.
    function setQaxh(address _qaxh) public {
        qaxh = _qaxh;
    }

    //should ultimately be put in the constructor
    function setLedger(address _ledger) public {
        qaxhMasterLedger = QaxhMasterLedger(_ledger);
    }

    function replaceOwner(address _owner) public filterQaxh {
        owner = _owner;
    }

    // Modifiers that manage permissions


    modifier filterOwner() {
        require(msg.sender == owner, "This method can only be called by the owner of the safe");
        _;
    }

    modifier filterQaxh() {
        require(msg.sender == qaxh, "This method can only be called by the qaxh address");
        _;
    }

    // Getters and Setters

    function getQaxh() public view returns (address) {
        return qaxh;
    }

    function getOwner() public view returns (address) {
        return owner;
    }

    // Event useful to debug

    event Event(address _address, string _description);

    event Log(uint a, uint b);
}
