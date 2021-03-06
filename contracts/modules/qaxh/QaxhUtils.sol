pragma solidity 0.4.24;
import "../../QaxhMasterLedger.sol";

/// @title QaxhUtils - A contract that manages the Qaxh platform and QaxhMasterLedger references into a Qaxh Module.
/// @author Clémence Gardelle
/// @author Loup Federico
contract QaxhUtils {

    address public qaxh;
    address public qaxhMasterLedger;

    /// @dev Setup qaxh and QaxhMasterLedger addresses references upon module creation.
    function setupUtils(address _qaxh, address _qaxhMasterLedger) public {
        require(qaxh == address(0), "Qaxh utils setup can only be done once");
        qaxh = _qaxh;
        qaxhMasterLedger = _qaxhMasterLedger;
    }

    modifier filterQaxh() {
        require(msg.sender == qaxh, "This method can only be called by the qaxh address");
        _;
    }
}
